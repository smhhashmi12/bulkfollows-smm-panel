import { renderHook, act } from '@testing-library/react-hooks';
import useChatSocket from '../hooks/useChatSocket';

// we can mock a simple websocket-like object
describe('useChatSocket', () => {
  it('should expose sendMessage function', () => {
    const { result } = renderHook(() => useChatSocket({ url: 'ws://localhost' }));
    expect(typeof result.current.sendMessage).toBe('function');
  });
});