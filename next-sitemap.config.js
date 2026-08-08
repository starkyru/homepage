/**
 * @type {import('next-sitemap').IConfig}
 * @see https://github.com/iamvishnusankar/next-sitemap#readme
 */
module.exports = {
  siteUrl: 'https://ilia.to',
  generateRobotsTxt: true,
  // Generated routes that are not pages: the OG card image and the llms.txt
  // plain-text feed (linked from robots.txt below instead).
  exclude: ['/opengraph-image', '/llms.txt'],
  // A resume changes a few times a year, not daily. `daily` on a site that is
  // static for months trains crawlers to distrust the hint.
  changefreq: 'monthly',
  priority: 0.7,
  transform: async (config, path) => ({
    loc: path,
    changefreq: config.changefreq,
    priority: path === '/' ? 1.0 : config.priority,
    lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
  }),
  robotsTxtOptions: {
    policies: [{ userAgent: '*', allow: '/' }],
    additionalSitemaps: [],
  },
};
