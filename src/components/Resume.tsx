import fs from 'fs';
import path from 'path';

function obfuscateEmail(html: string): string {
  // Replace plain-text email with a span that JS will decode on the client
  return html.replace(
    /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (_, user: string, domain: string) =>
      `<span class="email-protected" data-u="${btoa(user)}" data-d="${btoa(domain)}">[email protected]</span>`,
  );
}

function linkifyPhone(html: string): string {
  // Wrap US phone numbers like +1 (240) 853-7246 in a tel: link
  return html.replace(/(\+1\s*\(\d{3}\)\s*\d{3}-\d{4})/g, (match) => {
    const digits = match.replace(/[^\d+]/g, '');
    return `<a href="tel:${digits}">${match}</a>`;
  });
}

function parseResumeHtml() {
  const filePath = path.join(process.cwd(), 'public', 'resume.html');
  const content = fs.readFileSync(filePath, 'utf-8');

  const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/);

  const style = styleMatch?.[1] ?? '';
  let body = bodyMatch?.[1] ?? '';

  // Scope CSS selectors under .resume-embed to avoid global conflicts
  const scopedStyle = style.replace(/([^{}]+)\{/g, (_, selectors: string) => {
    const scoped = selectors
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)
      .map((s: string) => `.resume-embed ${s}`)
      .join(', ');
    return `${scoped} {`;
  });

  body = obfuscateEmail(body);
  body = linkifyPhone(body);

  return { scopedStyle, body };
}

const EMAIL_DECODE_SCRIPT = `
document.querySelectorAll('.email-protected').forEach(function(el) {
  var u = atob(el.dataset.u);
  var d = atob(el.dataset.d);
  el.textContent = u + '@' + d;
});
`;

export default function Resume() {
  const { scopedStyle, body } = parseResumeHtml();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: scopedStyle }} />
      <div
        className='resume-embed'
        dangerouslySetInnerHTML={{ __html: body }}
      />
      <script dangerouslySetInnerHTML={{ __html: EMAIL_DECODE_SCRIPT }} />
    </>
  );
}
