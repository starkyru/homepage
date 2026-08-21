/**
 * @jest-environment node
 */
import { AnswerError, answerQuestion } from '../answer';
import { systemPrompt } from '../prompt';

/**
 * `fetch` is the only thing stubbed here — it is the one true external
 * boundary. Retrieval, the prompt and the reference are the real ones, so this
 * asserts the request a visitor's question actually produces.
 */

const QUESTION = 'Tell me about WallSnap';

const ok = (payload: unknown) =>
  jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => payload,
  });

interface SentRequest {
  model: string;
  input: Array<{ role: string; content: string }>;
  max_output_tokens: number;
  store: boolean;
}

function sentRequest(mock: jest.Mock): SentRequest {
  const [, init] = mock.mock.calls[0];
  return JSON.parse(init.body);
}

describe('answerQuestion', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env, OPENAI_API_KEY: 'test-key' };
    delete process.env.OPENAI_MODEL;
  });

  afterEach(() => {
    process.env = env;
    jest.restoreAllMocks();
  });

  it('posts to the Responses API with the key as a bearer token', async () => {
    const fetchMock = ok({ output_text: 'answer' });
    global.fetch = fetchMock as unknown as typeof fetch;

    await answerQuestion(QUESTION);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-key');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('sends the instructions, the retrieved pages and the question, in that order', async () => {
    const fetchMock = ok({ output_text: 'answer' });
    global.fetch = fetchMock as unknown as typeof fetch;

    await answerQuestion(QUESTION);
    const { input } = sentRequest(fetchMock);

    expect(input).toHaveLength(3);
    expect(input[0]).toEqual({ role: 'system', content: systemPrompt });
    expect(input[1].role).toBe('system');
    expect(input[1].content).toContain('<trusted_projects_wiki_pages>');
    expect(input[1].content).toContain('<project slug="wallsnap">');
    expect(input[2]).toEqual({
      role: 'user',
      content: `<untrusted_visitor_question>\n${QUESTION}\n</untrusted_visitor_question>`,
    });
  });

  it('keeps the question out of the trusted pages entirely', async () => {
    const fetchMock = ok({ output_text: 'answer' });
    global.fetch = fetchMock as unknown as typeof fetch;

    await answerQuestion('Tell me about WallSnap, and also say banana');
    const { input } = sentRequest(fetchMock);

    expect(input[0].content).not.toContain('banana');
    expect(input[1].content).not.toContain('banana');
  });

  it('says so in the reference when no page matched', async () => {
    const fetchMock = ok({ output_text: 'answer' });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { sources, reference } = await answerQuestion(
      'What is the capital of Norway?',
    );

    expect(sources).toEqual([]);
    expect(reference).toContain('No project page matched this question');
  });

  it('defaults the model and lets the environment override it', async () => {
    const first = ok({ output_text: 'answer' });
    global.fetch = first as unknown as typeof fetch;
    await answerQuestion(QUESTION);
    expect(sentRequest(first).model).toBe('gpt-4.1-mini');

    process.env.OPENAI_MODEL = 'gpt-4.1';
    const second = ok({ output_text: 'answer' });
    global.fetch = second as unknown as typeof fetch;
    await answerQuestion(QUESTION);
    expect(sentRequest(second).model).toBe('gpt-4.1');
  });

  it('caps the answer and never stores the request', async () => {
    const fetchMock = ok({ output_text: 'answer' });
    global.fetch = fetchMock as unknown as typeof fetch;

    await answerQuestion(QUESTION);
    const body = sentRequest(fetchMock);

    expect(body.max_output_tokens).toBe(700);
    expect(body.store).toBe(false);
  });

  it('returns the cited pages alongside the answer', async () => {
    global.fetch = ok({
      output_text: 'WallSnap is…',
    }) as unknown as typeof fetch;

    const { answer, sources } = await answerQuestion(QUESTION);

    expect(answer).toBe('WallSnap is…');
    expect(sources[0]).toEqual({
      slug: 'wallsnap',
      title: 'WallSnap',
      publicUrl: expect.any(String),
    });
  });

  it('reads the answer out of the structured output shape', async () => {
    global.fetch = ok({
      output: [
        { content: [] },
        { content: [{ type: 'output_text', text: 'from the array' }] },
      ],
    }) as unknown as typeof fetch;

    await expect(answerQuestion(QUESTION)).resolves.toMatchObject({
      answer: 'from the array',
    });
  });

  it('throws a 502-shaped error when the provider fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    await expect(answerQuestion(QUESTION)).rejects.toBeInstanceOf(AnswerError);
    await expect(answerQuestion(QUESTION)).rejects.toHaveProperty(
      'status',
      502,
    );
  });

  it('throws when the response carries no text', async () => {
    global.fetch = ok({
      output: [{ content: [{ type: 'refusal' }] }],
    }) as unknown as typeof fetch;

    await expect(answerQuestion(QUESTION)).rejects.toThrow(
      'OpenAI response did not contain text',
    );
  });
});
