/** Shapes of the artifact `scripts/build-wiki.mjs` emits from content/wiki. */

export interface WikiProject {
  /** File name of the source page, without `.md`. */
  slug: string;
  title: string;
  /** Other names a visitor may use for the project, from front matter. */
  aliases: string[];
  category: string;
  status: string;
  /** Empty when the project has no public URL. */
  publicUrl: string;
  /** Position in index.md — the owner's ordering, used to break score ties. */
  indexRank: number;
  /** The page's self-contained opening paragraph. */
  overview: string;
  /** Flattened from the categorised "Technologies used" bullets. */
  technologies: string[];
  evidence: string;
  /** The whole page, front matter removed. */
  body: string;
}

export interface WikiCorpus {
  lastVerified: string;
  /** index.md — the routing document. */
  index: string;
  /** technologies.md — the reverse index. */
  technologies: string;
  projects: WikiProject[];
}

export interface WikiCitation {
  slug: string;
  title: string;
  publicUrl: string;
}
