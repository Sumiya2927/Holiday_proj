"""Use the installed PyMongo driver with the validated Node import plan."""
import json
import os
import re
import sys
from pymongo import MongoClient, UpdateOne

sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')


def main():
    plan = json.load(sys.stdin)
    db_name = os.environ.get('MONGODB_DB') or 'holiday_package'
    with MongoClient(os.environ['MONGODB_URI'], serverSelectionTimeoutMS=20000) as client:
        db = client[db_name]
        existing = set(db.list_collection_names())
        if not plan['verifyOnly']:
            for name, rows in plan['data'].items():
                if name not in existing:
                    db.create_collection(name, validator={'$jsonSchema': plan['schemas'][name]})
                collection = db[name]
                if name != 'destinations':
                    collection.create_index([(key, 1) for key in plan['keys'][name]], unique=True)
                for index in plan['indexes'][name]:
                    collection.create_index(list(index.items()))
                operations = [UpdateOne(
                    {key: row[key] for key in plan['keys'][name]},
                    {'$set': row}, upsert=True) for row in rows]
                result = collection.bulk_write(operations, ordered=True)
                print(f'{name}: inserted {result.upserted_count}, matched {result.matched_count}, modified {result.modified_count}', flush=True)
        for name, rows in plan['data'].items():
            key_fields = plan['keys'][name]
            records = list(db[name].find({}))
            by_key = {tuple(row.get(key) for key in key_fields): row for row in records}
            for row in rows:
                found = by_key.get(tuple(row[key] for key in key_fields))
                if found is None or any(found.get(key) != value for key, value in row.items()):
                    raise ValueError(f'{name}: source record verification failed')
            print(f'{name}: verified {len(rows)} source records ({len(records)} total)', flush=True)
        print(f'Verified database: {db_name}', flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        message = re.sub(r'mongodb(?:\+srv)?://\S+', '[redacted connection string]', str(error))
        print(f'Import/verification failed: {message}', file=sys.stderr)
        sys.exit(1)
