/**
 * @type {import('next-sitemap').IConfig}
 * @see https://github.com/iamvishnusankar/next-sitemap#readme
 */
module.exports = {
  siteUrl: 'https://ilia.to',
  generateRobotsTxt: true,
  // internal demo page (also noindex'd) + the generated OG image route
  exclude: ['/components', '/opengraph-image'],
  robotsTxtOptions: {
    policies: [{ userAgent: '*', allow: '/' }],
  },
};
