import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  ogImage?: string;
  ogImageOverride?: string;
  path?: string;
}

const BASE_URL = 'https://lesucreepasteleria.com.ar';
const DEFAULT_OG_IMAGE = 'https://qrspfsejotzfajwklocm.supabase.co/storage/v1/object/public/site-images/og_image.jpg';

export default function SEOHead({
  title = 'Le Sucrée Pastelería | Tortas Artesanales en Rosario',
  description = 'Pastelería artesanal en Rosario. Tortas, tartas, cookies y boxes hechos a mano con ingredientes seleccionados. Pedidos con 48hs de anticipación.',
  ogImage = DEFAULT_OG_IMAGE,
  ogImageOverride,
  path = '',
}: SEOHeadProps) {
  const url = `${BASE_URL}${path}`;
  const effectiveOgImage = ogImageOverride || ogImage;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={effectiveOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:site_name" content="Le Sucrée Pastelería" />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={effectiveOgImage} />
    </Helmet>
  );
}
