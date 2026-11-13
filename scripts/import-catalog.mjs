import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalogDir = path.resolve(process.env.CATALOG_DIR || path.join(root, 'data/catalog'));
const keys = {
  airports: ['code'], destinations: ['_id'], hotels: ['hotel_id'],
  rooms: ['room_id'], availability: ['room_id', 'date'], flights: ['flight_id'],
  transfers: ['transfer_id'], attractions: ['attraction_id'],
};
const indexes = {
  airports: [{ serves_cities: 1 }], destinations: [],
  hotels: [{ city: 1, stars: -1 }, { city: 1, area: 1 }],
  rooms: [{ hotel_id: 1, max_adults: 1, max_children: 1 }],
  availability: [{ date: 1, rooms_left: 1 }],
  flights: [{ from: 1, to: 1, arrival_local: 1 }, { from: 1, to: 1, departure_local: 1 }],
  transfers: [{ airport: 1, city: 1, area: 1 }, { from_city: 1, to_city: 1 }],
  attractions: [{ city: 1, category: 1 }, { city: 1, open_days: 1 }],
};
const filterFor = (name, row) => Object.fromEntries(keys[name].map(key => [key, row[key]]));

// Infer nested field types across ALL records, including nulls and optional fields.
// Numeric fields accept BSON numeric types; dates and local times stay strings.
function schema(values) {
  const typeOf = value => value === null ? 'null' : Array.isArray(value) ? 'array'
    : typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'bool' : typeof value;
  const types = [...new Set(values.map(typeOf))];
  if (types.length > 1) return { anyOf: types.map(type => schema(values.filter(v => typeOf(v) === type))) };
  const type = types[0];
  if (type === 'number') return { bsonType: ['int', 'long', 'double', 'decimal'] };
  if (type === 'array') {
    const items = values.flat();
    return { bsonType: 'array', ...(items.length ? { items: schema(items) } : {}) };
  }
  if (type === 'object') {
    const fields = [...new Set(values.flatMap(Object.keys))];
    const required = fields.filter(key => values.every(v => Object.hasOwn(v, key)));
    return { bsonType: 'object', ...(required.length ? { required } : {}),
      properties: Object.fromEntries(fields.map(key => [key, schema(values.filter(v => Object.hasOwn(v, key)).map(v => v[key]))])) };
  }
  return { bsonType: type };
}

async function loadCatalog() {
  const data = {};
  for (const name of Object.keys(keys)) {
    const raw = JSON.parse((await readFile(path.join(catalogDir, `${name}.json`), 'utf8')).replace(/^\uFEFF/, ''));
    const rows = name === 'destinations' ? [{ ...raw, _id: 'catalog' }] : raw;
    assert(Array.isArray(rows) && rows.length, `${name}: expected non-empty array`);
    const seen = new Set();
    for (const row of rows) {
      for (const key of keys[name]) assert(typeof row[key] === 'string' && row[key], `${name}: missing ${key}`);
      const id = JSON.stringify(filterFor(name, row));
      assert(!seen.has(id), `${name}: duplicate key ${id}`);
      seen.add(id);
    }
    data[name] = rows;
  }
  const ids = (name, field) => new Set(data[name].map(row => row[field]));
  const airports = ids('airports', 'code'), hotels = ids('hotels', 'hotel_id');
  const rooms = ids('rooms', 'room_id'), transfers = ids('transfers', 'transfer_id');
  for (const row of data.rooms) assert(hotels.has(row.hotel_id), `Unknown hotel: ${row.hotel_id}`);
  for (const row of data.availability) {
    assert(rooms.has(row.room_id), `Unknown room: ${row.room_id}`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(row.date), `Invalid date: ${row.date}`);
    assert(Number.isInteger(row.rooms_left) && row.rooms_left >= 0, 'Invalid rooms_left');
  }
  for (const row of data.flights) assert(airports.has(row.from) && airports.has(row.to), `Unknown flight airport: ${row.flight_id}`);
  for (const row of data.transfers) if (row.airport != null) assert(airports.has(row.airport), `Unknown transfer airport: ${row.airport}`);
  const destination = data.destinations[0];
  for (const city of destination.departure_cities) assert(airports.has(city.airport), `Unknown departure airport: ${city.airport}`);
  for (const country of destination.countries) {
    for (const city of country.cities) for (const code of city.airports) assert(airports.has(code), `Unknown destination airport: ${code}`);
    for (const link of country.links) for (const id of link.transfer_ids) assert(transfers.has(id), `Unknown transfer: ${id}`);
  }
  return data;
}

async function verify(db, data) {
  for (const [name, rows] of Object.entries(data)) {
    const actual = await db.collection(name).find({}).toArray();
    const byKey = new Map(actual.map(row => [JSON.stringify(filterFor(name, row)), row]));
    for (const row of rows) {
      const found = byKey.get(JSON.stringify(filterFor(name, row)));
      assert(found, `${name}: missing ${JSON.stringify(filterFor(name, row))}`);
      // Compare every source field; allow MongoDB _id and unrelated application fields.
      for (const key of Object.keys(row)) assert.deepStrictEqual(found[key], row[key], `${name}: mismatch in ${key}`);
    }
    console.log(`${name}: verified ${rows.length} source records (${actual.length} total)`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  assert(args.every(arg => ['--dry-run', '--verify', '--python'].includes(arg)), 'Unknown option');
  const data = await loadCatalog();
  console.table(Object.entries(data).map(([collection, rows]) => ({ collection, records: rows.length })));
  if (args.includes('--dry-run')) {
    for (const rows of Object.values(data)) schema(rows);
    console.log('Dataset shapes, unique keys and references validated. No database writes.');
    return;
  }
  const uri = process.env.MONGODB_URI;
  assert(uri && !/USERNAME|PASSWORD|YOUR-CLUSTER|<[^>]+>/.test(uri), 'Set MONGODB_URI in .env to your actual Atlas connection string.');
  const dbName = process.env.MONGODB_DB || 'holiday_package';
  assert(!['admin', 'local', 'config'].includes(dbName), 'Choose an application database.');
  if (args.includes('--python')) {
    const result = spawnSync('python', [path.join(root, 'scripts/import-catalog.py')], {
      input: JSON.stringify({ data, keys, indexes, schemas: Object.fromEntries(Object.entries(data).map(([name, rows]) => [name, schema(rows)])), verifyOnly: args.includes('--verify') }),
      encoding: 'utf8', env: process.env,
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error) throw result.error;
    assert(result.status === 0, 'Python MongoDB import failed.');
    return;
  }
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
    const db = client.db(dbName);
    if (!args.includes('--verify')) {
      const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name));
      for (const [name, rows] of Object.entries(data)) {
        // Existing collection validators are left intact; new collections get inferred validators.
        if (!existing.has(name)) await db.createCollection(name, { validator: { $jsonSchema: schema(rows) } });
        const collection = db.collection(name);
        if (name !== 'destinations') await collection.createIndex(Object.fromEntries(keys[name].map(k => [k, 1])), { unique: true });
        for (const index of indexes[name]) await collection.createIndex(index);
        // Re-runs restore source fields without dropping collections or deleting other records.
        const result = await collection.bulkWrite(rows.map(row => ({ updateOne: {
          filter: filterFor(name, row), update: { $set: row }, upsert: true,
        } })), { ordered: true });
        console.log(`${name}: inserted ${result.upsertedCount}, matched ${result.matchedCount}, modified ${result.modifiedCount}`);
      }
    }
    await verify(db, data);
    console.log(`Verified database: ${dbName}`);
  } finally {
    await client.close();
  }
}

main().catch(error => {
  // Never print connection strings or credential-bearing driver error details.
  const message = String(error.message).replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, '[redacted connection string]');
  console.error(`Import/verification failed: ${message}`);
  console.error('Check .env, Atlas Network Access, and database user permissions. Partial imports can be safely rerun.');
  process.exitCode = 1;
});
