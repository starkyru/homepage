export default function PdfIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 48 48'
      width={size}
      height={size}
      fill='none'
      stroke='currentColor'
      strokeWidth={2.5}
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      {/* Document body */}
      <path d='M8 6a2 2 0 0 1 2-2h16l12 12v26a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V6z' />
      {/* Folded corner */}
      <path d='M26 4v10h12' />
      {/* PDF badge */}
      <rect
        x='4'
        y='18'
        width='22'
        height='11'
        rx='2'
        fill='#dc2626'
        stroke='none'
      />
      <text
        x='15'
        y='27'
        textAnchor='middle'
        fill='white'
        stroke='none'
        fontSize='9'
        fontWeight='bold'
        fontFamily='Arial, sans-serif'
      >
        PDF
      </text>
      {/* Download arrow */}
      <path d='M24 32v8' stroke='#dc2626' strokeWidth={2.5} />
      <path d='M20 37l4 4 4-4' stroke='#dc2626' strokeWidth={2.5} />
    </svg>
  );
}
