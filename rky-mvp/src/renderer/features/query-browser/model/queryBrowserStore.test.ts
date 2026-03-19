import { describe, it, expect, beforeEach } from 'vitest';
import { useQueryBrowserStore } from './queryBrowserStore';

describe('queryBrowserStore', () => {
  beforeEach(() => {
    useQueryBrowserStore.setState({
      activeTab: 'query',
      selectedQueryId: null,
      selectedCollectionId: null,
      historyDrawerOpen: false,
    });
  });

  it('defaults to query tab', () => {
    expect(useQueryBrowserStore.getState().activeTab).toBe('query');
  });

  it('sets active tab', () => {
    useQueryBrowserStore.getState().setActiveTab('collection');
    expect(useQueryBrowserStore.getState().activeTab).toBe('collection');
  });

  it('sets selected query id', () => {
    useQueryBrowserStore.getState().setSelectedQueryId('q1');
    expect(useQueryBrowserStore.getState().selectedQueryId).toBe('q1');
  });

  it('clears selected query id', () => {
    useQueryBrowserStore.getState().setSelectedQueryId('q1');
    useQueryBrowserStore.getState().setSelectedQueryId(null);
    expect(useQueryBrowserStore.getState().selectedQueryId).toBeNull();
  });

  it('sets selected collection id', () => {
    useQueryBrowserStore.getState().setSelectedCollectionId('c1');
    expect(useQueryBrowserStore.getState().selectedCollectionId).toBe('c1');
  });

  it('toggles history drawer', () => {
    useQueryBrowserStore.getState().setHistoryDrawerOpen(true);
    expect(useQueryBrowserStore.getState().historyDrawerOpen).toBe(true);
    useQueryBrowserStore.getState().setHistoryDrawerOpen(false);
    expect(useQueryBrowserStore.getState().historyDrawerOpen).toBe(false);
  });
});
