export default function WaveIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M2 6c1.5-1.5 3-2 4.5-2S9.5 5 11 6s3 2 4.5 2 3-.5 4.5-2' />
      <path d='M2 12c1.5-1.5 3-2 4.5-2s3 1.5 4.5 3 3 2 4.5 2 3-.5 4.5-2' />
      <path d='M2 18c1.5-1.5 3-2 4.5-2s3 1.5 4.5 3 3 2 4.5 2 3-.5 4.5-2' />
    </svg>
  );
}
