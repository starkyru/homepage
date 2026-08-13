import type { WikiCitation } from '@/lib/wiki/types';

export type ChatMessageData = {
  role: 'assistant' | 'user';
  text: string;
  /** Wiki pages the answer was grounded in, so a claim can be checked. */
  sources?: WikiCitation[];
};

/** One chat bubble, with the project pages behind a grounded answer. */
export default function ChatMessage({ message }: { message: ChatMessageData }) {
  const sources = message.sources ?? [];

  return (
    <div
      className={`max-w-[90%] rounded-lg border px-3 py-2 ${
        message.role === 'user'
          ? 'ml-auto border-transparent bg-[#b9702e] text-[#1a1209]'
          : 'border-amber-100/10 bg-[#211a12] text-[#ece7dd]'
      }`}
    >
      <p className='whitespace-pre-wrap text-sm leading-6'>{message.text}</p>
      {sources.length > 0 && (
        <p className='mt-2 border-t border-amber-100/10 pt-2 text-[11px] leading-4 text-[#8e8171]'>
          <span className='mr-1'>Wiki pages used:</span>
          {sources.map((source, index) => (
            <span key={source.slug}>
              {index > 0 && ', '}
              {source.publicUrl ? (
                <a
                  href={source.publicUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-[#c5b9a7] underline decoration-dotted underline-offset-2 hover:text-[#f5d59a]'
                >
                  {source.title}
                </a>
              ) : (
                source.title
              )}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
