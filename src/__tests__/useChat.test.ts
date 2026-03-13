import { renderHook, act } from '@testing-library/react-hooks';
import useChat from '../hooks/useChat';

// Mock fetch for channels
global.fetch = jest.fn(() =>
  Promise.resolve({ json: () => Promise.resolve([{ id: '1', name: 'general' }]) })
) as any;

describe('useChat', () => {
  it('loads channels on mount', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useChat());

    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.channels).toHaveLength(1);
    expect(result.current.channels[0].name).toBe('general');
  });
});