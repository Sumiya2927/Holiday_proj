import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, request } from '../api/http';
import { trip, pkg } from './fixtures';
afterEach(() => vi.unstubAllGlobals());
describe('API boundary', () => {
 it('submits the seven-field request and unwraps the response', async () => {const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({success:true,data:pkg})});vi.stubGlobal('fetch',fetch);expect(await api.generate(trip)).toEqual(pkg);expect(fetch).toHaveBeenCalledWith('/api/packages/generate',expect.objectContaining({method:'POST',body:JSON.stringify(trip)}));});
 it('preserves backend conflict reasons and details',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:409,json:async()=>({success:false,error:{code:'INVALID_CHANGE',message:'The flight misses your transfer.',details:{field:'flight'}}})}));await expect(api.modify('x',{type:'flight'})).rejects.toMatchObject({code:'INVALID_CHANGE',message:'The flight misses your transfer.',status:409});});
 it('keeps leading zeroes in references',async()=>{const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({data:pkg})});vi.stubGlobal('fetch',fetch);await api.reservation('0123456789');expect(fetch.mock.calls[0][0]).toBe('/api/reservations/0123456789');});
 it('handles network and non-JSON proxy failures',async()=>{vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));await expect(request('/x')).rejects.toHaveProperty('code','NETWORK_ERROR');vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:502,json:async()=>{throw Error();}}));await expect(request('/x')).rejects.toHaveProperty('code','SERVICE_UNAVAILABLE');});
 it('returns the authoritative export blob',async()=>{const blob=new Blob(['{"status":"BOOKED"}'],{type:'application/json'});vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,blob:async()=>blob}));expect(await api.export('x')).toBe(blob);});
});
