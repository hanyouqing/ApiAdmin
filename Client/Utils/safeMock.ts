import { faker } from '@faker-js/faker';

function randomInt(min = 0, max = 100) {
  return faker.number.int({ min, max });
}

export const Random = {
  integer: (min = 1, max = 100) => randomInt(min, max),
  natural: (min = 0, max = 100) => randomInt(min, max),
  float: (min = 0, max = 100) => faker.number.float({ min, max, fractionDigits: 2 }),
  boolean: () => faker.datatype.boolean(),
  string: (min = 5, max = 10) => faker.string.alphanumeric({ length: { min, max } }),
  word: () => faker.lorem.word(),
  title: () => faker.lorem.words(3),
  sentence: () => faker.lorem.sentence(),
  paragraph: () => faker.lorem.paragraph(),
  name: () => faker.person.fullName(),
  first: () => faker.person.firstName(),
  last: () => faker.person.lastName(),
  email: () => faker.internet.email(),
  url: () => faker.internet.url(),
  ip: () => faker.internet.ipv4(),
  guid: () => faker.string.uuid(),
  uuid: () => faker.string.uuid(),
  id: () => faker.string.uuid(),
  date: () => faker.date.recent().toISOString().slice(0, 10),
  time: () => faker.date.recent().toISOString().slice(11, 19),
  datetime: () => faker.date.recent().toISOString(),
  now: () => new Date().toISOString(),
  color: () => faker.color.rgb(),
  image: () => faker.image.url(),
};

function resolvePlaceholder(token: string) {
  const key = String(token || '').replace(/^@/, '').split('(')[0].trim().toLowerCase();
  const map: Record<string, () => any> = {
    integer: () => Random.integer(),
    natural: () => Random.natural(),
    float: () => Random.float(),
    boolean: () => Random.boolean(),
    string: () => Random.string(),
    word: () => Random.word(),
    title: () => Random.title(),
    sentence: () => Random.sentence(),
    paragraph: () => Random.paragraph(),
    name: () => Random.name(),
    cname: () => Random.name(),
    first: () => Random.first(),
    last: () => Random.last(),
    email: () => Random.email(),
    url: () => Random.url(),
    ip: () => Random.ip(),
    guid: () => Random.guid(),
    uuid: () => Random.uuid(),
    id: () => Random.id(),
    date: () => Random.date(),
    time: () => Random.time(),
    datetime: () => Random.datetime(),
    now: () => Random.now(),
    color: () => Random.color(),
    image: () => Random.image(),
  };
  return (map[key] || (() => token))();
}

function parseRange(spec?: string) {
  if (!spec) return 1;
  if (/^\d+$/.test(spec)) return parseInt(spec, 10);
  const m = String(spec).match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) return randomInt(parseInt(m[1], 10), parseInt(m[2], 10));
  return 1;
}

function mockNode(node: any): any {
  if (Array.isArray(node)) return node.map((item) => mockNode(item));
  if (node && typeof node === 'object') {
    const out: Record<string, any> = {};
    for (const [rawKey, value] of Object.entries(node)) {
      const [name, range] = String(rawKey).split('|');
      if (range !== undefined) {
        const count = parseRange(range);
        if (Array.isArray(value)) {
          const template = value[0] ?? null;
          out[name] = Array.from({ length: count }, () => mockNode(template));
        } else if (typeof value === 'string' && value.startsWith('@')) {
          out[name] = Array.from({ length: count }, () => resolvePlaceholder(value));
        } else if (value && typeof value === 'object') {
          out[name] = Array.from({ length: count }, () => mockNode(value));
        } else {
          out[name] = value;
        }
      } else if (typeof value === 'string' && value.startsWith('@')) {
        out[name] = resolvePlaceholder(value);
      } else {
        out[name] = mockNode(value);
      }
    }
    return out;
  }
  if (typeof node === 'string' && node.startsWith('@')) return resolvePlaceholder(node);
  return node;
}

export function mock(template: any) {
  if (template == null) return template;
  try {
    const cloned = typeof structuredClone === 'function'
      ? structuredClone(template)
      : JSON.parse(JSON.stringify(template));
    return mockNode(cloned);
  } catch {
    return mockNode(template);
  }
}

const Mock = { mock, Random };
export default Mock;
