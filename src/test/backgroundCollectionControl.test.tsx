// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OTCCollectionStatus } from '@/types/otcCollection';
const calls=vi.hoisted(()=>({get:vi.fn(),set:vi.fn(),run:vi.fn()}));
vi.mock('@/lib/otcCollection',()=>({getOTCCollectionStatus:calls.get,setOTCCollectionEnabled:calls.set,runOTCCollection:calls.run}));
import BackgroundCollectionControl from '@/components/admin/BackgroundCollectionControl';
const base:OTCCollectionStatus={enabled:false,totalAssets:141,initializedAssets:0,currentAssets:0,uninitializedAssets:141,maxLagSeconds:null,updatedAt:null,lastStartedAt:null,lastFinishedAt:null,lastResult:null,lastError:null,running:false,serverNow:'2026-11-04T00:00:00Z',schedulerSecretConfigured:false};
beforeEach(()=>{vi.resetAllMocks();calls.get.mockResolvedValue({...base});calls.run.mockResolvedValue({skipped:false,result:{assets:141,processed:[],errors:[],remaining:141,complete:false}});});
afterEach(()=>{cleanup();vi.useRealTimers();});
describe('all-asset background collection administration',()=>{
  it('persists the global setting and starts one explicit initial cycle while warning scheduling is separate',async()=>{
    calls.set.mockImplementation(async enabled=>{const status={...base,enabled};calls.get.mockResolvedValue(status);return status;});
    render(<BackgroundCollectionControl/>);
    const enable=await screen.findByRole('button',{name:'Enable all assets & collect now'});
    await waitFor(()=>expect(enable.hasAttribute('disabled')).toBe(false));fireEvent.click(enable);
    await waitFor(()=>expect(calls.run).toHaveBeenCalledOnce());
    expect(calls.set).toHaveBeenCalledWith(true);
    expect(await screen.findByText(/Partial cycle finished/)).toBeTruthy();
    expect(screen.getByText(/A frequent scheduler is still required/)).toBeTruthy();
    await waitFor(()=>expect(screen.getByRole('button',{name:'Disable background collection'}).hasAttribute('disabled')).toBe(false));
    fireEvent.click(screen.getByRole('button',{name:'Disable background collection'}));
    await waitFor(()=>expect(calls.set).toHaveBeenLastCalledWith(false));
    expect(calls.run).toHaveBeenCalledOnce();
  });
  it('fails visibly and prevents enabling when the protected status request fails',async()=>{
    calls.get.mockRejectedValue(new Error('Admin role required'));
    render(<BackgroundCollectionControl/>);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent','Admin role required');
    expect(screen.getByRole('button',{name:'Enable all assets & collect now'}).hasAttribute('disabled')).toBe(true);
    expect(calls.set).not.toHaveBeenCalled();expect(calls.run).not.toHaveBeenCalled();
  });
  it('polls status only and cleans up its timer; it is not a browser-driven collector',async()=>{
    vi.useFakeTimers();render(<BackgroundCollectionControl/>);
    await act(async()=>{});
    await act(async()=>{vi.advanceTimersByTime(60000);});
    expect(calls.get).toHaveBeenCalledTimes(3);expect(calls.run).not.toHaveBeenCalled();expect(calls.set).not.toHaveBeenCalled();
    cleanup();expect(vi.getTimerCount()).toBe(0);
  });
});
describe('authenticated scheduler evidence',()=>{
 it('shows missing scheduled execution even after a successful manual cycle',async()=>{
  calls.get.mockResolvedValue({...base,enabled:true,lastFinishedAt:base.serverNow,scheduler:{state:'missing',lastSeenAt:null,lastFinishedAt:null,consecutiveSuccesses:0,lastError:null,freshAssets:0,freshnessWindowSeconds:120,heartbeatWindowSeconds:150}});
  render(<BackgroundCollectionControl/>);
  expect(await screen.findByText(/Scheduler not observed/)).toBeTruthy();
  expect(screen.queryByText(/Recent scheduled runs verified/)).toBeNull();
 });
 it('reports observed health only from separate scheduled-run and freshness evidence',async()=>{
  calls.get.mockResolvedValue({...base,enabled:true,scheduler:{state:'healthy',lastSeenAt:base.serverNow,lastFinishedAt:base.serverNow,consecutiveSuccesses:2,lastError:null,freshAssets:141,freshnessWindowSeconds:120,heartbeatWindowSeconds:150}});
  render(<BackgroundCollectionControl/>);
  expect(await screen.findByText(/Recent scheduled runs verified/)).toBeTruthy();
  expect(screen.getByText(/141\/141 assets advanced/)).toBeTruthy();
  expect(screen.queryByText(/A frequent scheduler is still required/)).toBeNull();
 });
});
