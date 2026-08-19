/**
 * Meta title/description por página (checklist produção #3, #4)
 * usando react-helmet-async. Envolver a app em <HelmetProvider/>.
 */
import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  path?: string;
  noindex?: boolean;
  ogImage?: string;
}

const SITE = "Faro Study";
const BASE_URL = "https://farostudy.vercel.app";

export function SEO({ title, description, path = "/", noindex, ogImage }: SEOProps) {
  // A home passa o próprio nome do site como título; evita "Faro Study | Faro Study".
  const fullTitle = title === SITE ? SITE : `${title} | ${SITE}`;
  const url = `${BASE_URL}${path}`;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex ? <meta name="robots" content="noindex,nofollow" /> : null}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage ?? `${BASE_URL}/og-image.png`} />
    </Helmet>
  );
}
