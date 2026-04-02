import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  ogImage?: string;
  path?: string;
}

const BASE_URL = 'https://lesucree.lovable.app';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.jpg`;

export default function SEOHead({
  title = 'Le Sucrée Pastelería | Tortas Artesanales en Rosario',
  description = 'Pastelería artesanal en Rosario. Tortas, tartas, cookies y boxes hechos a mano con ingredientes seleccionados. Pedidos con 48hs de anticipación.',
  ogImage = DEFAULT_OG_IMAGE,
  path = '',
}: SEOHeadProps) {
  const url = `${BASE_URL}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
