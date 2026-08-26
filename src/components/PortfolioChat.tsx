'use client';

import { MessageCircle, Send, X } from 'lucide-react';
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import {
  accordionIsOpen,
  accordionIsOpenOnServer,
  subscribeAccordion,
} from '@/lib/accordion-signal';
import type { WikiCitation } from '@/lib/wiki/types';

import ChatMessage, { ChatMessageData } from '@/components/ChatMessage';

type Message = ChatMessageData;

const openingMessage: Message = {
  role: 'assistant',
  text: 'Ask about Ilia’s experience, technologies, projects, or fit for a job description.',
};

export default function PortfolioChat() {
  const [enabled, setEnabled] = useState(false);
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([openingMessage]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  // The chain's accordion opens into the same corner. While it is up the
  // launcher gives the room back: the label slides shut against the icon, which
  // is pinned to the right, so the pill shrinks rightward into a disc. Its own
  // panel being open outranks that — there is nothing left to make room for.
  const accordionUp = useSyncExternalStore(
    subscribeAccordion,
    accordionIsOpen,
    accordionIsOpenOnServer,
  );
  const collapsed = accordionUp && !open;

  useEffect(() => {
    fetch('/api/chat/status')
      .then((response) => response.json())
      .then((data: { enabled?: boolean }) => setEnabled(data.enabled === true))
      .catch(() => setEnabled(false))
      .finally(() => setChecked(true));
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // The launcher is unmounted while the panel is up (the panel takes its spot),
  // so closing would drop focus on the body — Escape especially, which leaves no
  // pointer to say where the visitor was. Hand it back to the launcher.
  useEffect(() => {
    if (wasOpen.current && !open) launcherRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const question = message.trim();
    if (!question || pending) return;

    setMessages((current) => [...current, { role: 'user', text: question }]);
    setMessage('');
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question }),
      });
      const data = (await response.json()) as {
        answer?: string;
        sources?: WikiCitation[];
        error?: string;
      };
      const answer = data.answer;
      if (!response.ok || !answer)
        throw new Error(data.error || 'Request failed');
      setMessages((current) => [
        ...current,
        { role: 'assistant', text: answer, sources: data.sources },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The assistant is temporarily unavailable.',
      );
    } finally {
      setPending(false);
    }
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  if (!checked) return null;

  const panelOpen = open && enabled;

  return (
    // Above the chain's HUD row, not on top of it: the next-role arrow sits 28px
    // up and is 48px tall, and this launcher outranks it (z-60), so at the
    // default offset it covers the arrow outright. 100px clears it by 24, and
    // the right offset is the HUD's own 40px padding, so the two stack flush.
    // Keyed to the width the physics view starts at (MIN_PHYSICS_WIDTH in
    // SiteShell) — below that there is no arrow to clear or line up with.
    // Under that width the bottom accordion nav is the thing to clear instead:
    // 4.5rem is its height (MOBILE_NAV_H in home/model.ts), so the launcher sits
    // directly on top of the bar rather than over its buttons.
    <div className='fixed bottom-[4.5rem] right-2 z-[60] font-primary min-[900px]:bottom-[100px] min-[900px]:right-10'>
      {panelOpen && (
        <div
          ref={dialogRef}
          role='dialog'
          aria-modal='true'
          aria-labelledby='portfolio-chat-title'
          // The panel sits where the launcher was — the launcher is unmounted
          // while it is up — so it starts at the container's own offset and
          // needs no gap under it. The height cap is what keeps it off the top
          // of the screen: 7rem is that offset (4.5rem, clearing the accordion
          // bar) plus a margin at the top, and 8.25rem is the same sum once the
          // offset rises to 100px to clear the HUD arrow.
          // The width is twice the container's `right-2`, so the margin the
          // panel leaves on the left matches the one on the right. Desktop is
          // capped by `max-w` well before this binds.
          className='flex h-[min(620px,calc(100dvh-7rem))] w-[calc(100vw-1rem)] max-w-[430px] flex-col overflow-hidden rounded-xl border border-amber-200/25 bg-[#16120d] text-[#ece7dd] shadow-2xl shadow-black/50 min-[900px]:h-[min(620px,calc(100dvh-8.25rem))]'
        >
          <header className='flex items-center justify-between border-b border-amber-100/15 px-4 py-3'>
            <div>
              <h2
                id='portfolio-chat-title'
                className='text-sm font-semibold tracking-wide'
              >
                Ask about Ilia
              </h2>
              <p className='mt-0.5 text-xs text-[#c5b9a7]'>
                Portfolio assistant
              </p>
            </div>
            <button
              type='button'
              onClick={() => setOpen(false)}
              className='rounded-md p-2 text-[#c5b9a7] transition hover:bg-amber-50/10 hover:text-[#f5d59a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0a458]'
              aria-label='Close chat'
            >
              <X size={18} aria-hidden='true' />
            </button>
          </header>

          <div
            className='flex-1 space-y-3 overflow-y-auto px-4 py-4'
            aria-live='polite'
          >
            {messages.map((item, index) => (
              <ChatMessage key={`${item.role}-${index}`} message={item} />
            ))}
            {pending && (
              <p className='text-sm text-[#c5b9a7]'>Checking the portfolio…</p>
            )}
            {error && <p className='text-sm text-[#f3b5a5]'>{error}</p>}
          </div>

          <form onSubmit={submit} className='border-t border-amber-100/15 p-3'>
            <label className='sr-only' htmlFor='portfolio-chat-input'>
              Ask a question about Ilia
            </label>
            <div className='flex items-end gap-2'>
              <textarea
                ref={inputRef}
                id='portfolio-chat-input'
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={onInputKeyDown}
                maxLength={6000}
                rows={2}
                placeholder='e.g. Where has he used React Native?'
                className='min-h-11 flex-1 resize-none rounded-md border border-amber-100/20 bg-[#0f0c09] px-3 py-2 text-sm text-[#ece7dd] placeholder:text-[#8e8171] focus:border-[#e0a458] focus:outline-none focus:ring-1 focus:ring-[#e0a458]'
              />
              <button
                type='submit'
                disabled={!message.trim() || pending}
                className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#e0a458] text-[#20160c] transition hover:bg-[#efbb71] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5d59a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#16120d]'
                aria-label='Send question'
              >
                <Send size={17} aria-hidden='true' />
              </button>
            </div>
            <p className='mt-2 text-[11px] leading-4 text-[#8e8171]'>
              Answers are based only on portfolio material. Do not share
              confidential information.
            </p>
          </form>
        </div>
      )}

      {!panelOpen && (
        <button
          ref={launcherRef}
          type='button'
          onClick={() => enabled && setOpen((current) => !current)}
          disabled={!enabled}
          title={
            enabled ? 'Ask about Ilia' : 'Portfolio chat is not configured'
          }
          className='chat-launcher group inline-flex items-center rounded-full border border-amber-100/25 bg-[#16120d] py-3 pl-3 pr-3 text-sm font-semibold text-[#f5d59a] shadow-lg shadow-black/35 hover:border-[#e0a458] hover:bg-[#211a12] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0a458] focus-visible:ring-offset-2 focus-visible:ring-offset-[#100e0b] sm:pl-4'
          // Horizontal padding closes with the label so what is left is a disc
          // around the icon, not a stadium with a gap where the words were. The
          // extra left padding is the label's, so it is keyed to the same `sm`
          // the label is — below it the button is icon-only and an asymmetric
          // pad makes an oval with the icon sitting off its centre. Only the
          // collapse is inline; the resting value has to stay in the classes or
          // it would outrank the breakpoint.
          style={collapsed ? { paddingLeft: 12 } : undefined}
          aria-label={
            enabled ? 'Open portfolio chat' : 'Portfolio chat is not configured'
          }
        >
          <MessageCircle size={19} aria-hidden='true' />
          {/* `hidden sm:inline-block` is the breakpoint rule this always had —
              below sm the launcher is icon-only and there is nothing to
              collapse. The width and the gap are what animate, so both are
              inline: max-width because a span has no width to transition from,
              and margin because a flex `gap` would hold the space open at zero
              width. */}
          <span
            className='chat-launcher__label hidden sm:inline-block'
            style={{
              maxWidth: collapsed ? 0 : '9rem',
              marginLeft: collapsed ? 0 : 8,
              opacity: collapsed ? 0 : 1,
            }}
          >
            Ask about Ilia
          </span>
        </button>
      )}
    </div>
  );
}
