import { describe, it, expect } from 'vitest';
import { validateRequest, money, date, time } from '../utils/format';
import { options, trip } from './fixtures';
describe('trip input boundaries', () => {
 it('accepts the Menon request and alternate UAE request', () => {expect(validateRequest(trip,options)).toEqual({});expect(validateRequest({...trip,departure_airport:'MAA',country:'AE',start_date:'2027-04-01',nights:3,children_ages:[0,17]},options)).toEqual({});});
 it('accepts returning on April 20 and rejects the next day', () => {expect(validateRequest({...trip,start_date:'2027-04-17',nights:3},options)).toEqual({});expect(validateRequest({...trip,start_date:'2027-04-18',nights:3},options)).toHaveProperty('start_date');});
 it.each([{nights:2},{nights:11},{adults:0},{adults:1.5},{children_ages:[18]},{children_ages:['']},{children_ages:[-1]},{budget:0},{budget:NaN},{country:'XX'},{departure_airport:'XXX'},{start_date:''}])('rejects invalid fields %j', patch => {expect(Object.keys(validateRequest({...trip,...patch},options)).length).toBeGreaterThan(0);});
 it('formats Indian currency and preserves local flight dates/times', () => {expect(money(350000)).toBe('₹3,50,000');expect(date('2027-04-09T23:00:00')).toBe('9 Apr 2027');expect(time('2027-04-10T10:00:00')).toBe('10:00');});
});
