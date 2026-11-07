import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Check, Copy, Minus, Plus, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import ProductImage from '@/components/ProductImage';
import ProductDetailModal from '@/components/ProductDetailModal';
import SEOHead from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useActivePromotions, applyBestPromotion } from '@/hooks/useActivePromotions';
import { getProductStatusBehavior } from '@/lib/productStatus';
import { formatPrice } from '@/lib/formatPrice';
import { WHATSAPP_NUMBER } from '@/lib/constants';
import { getWhatsAppLink } from '@/lib/whatsapp';
import NotFound from './NotFound';

type Variant = Tables<'product_variants'>;

function ProductDetail({ product, variants, slug }: { product: Tables<'products'>; variants: Variant[]; slug: string }) {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(variants[0] ?? null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { addToCart, setIsOpen } = useCart();
  const promosMap = useActivePromotions();
  const productPromos = promosMap.get(product.id);
  const isCustomizable = product.is_customizable === true;
  const behavior = getProductStatusBehavior(product, isCustomizable);
  const basePrice = selectedVariant?.price ?? product.price;
  const { final: currentPrice, hasDiscount, promo } = applyBestPromotion(basePrice, productPromos);
  const path = `/catalogo/${encodeURIComponent(slug)}`;
  const url = `https://lesucree.lovable.app${path}`;
  const description = product.description || `${product.name} de Le Sucrée Pastelería artesanal en Rosario.`;
  const consultText = selectedVariant
    ? `Hola! Quiero consultar por ${product.name} - ${selectedVariant.label}`
    : `Hola! Quiero consultar por ${product.name}`;
  const consultUrl = getWhatsAppLink(WHATSAPP_NUMBER, consultText) ?? '#';
  const availability = product.status === 'agotado' ? 'OutOfStock' : product.status === 'proximamente' ? 'PreOrder' : 'InStock';
  const offer = (price: number) => ({
    '@type': 'Offer', priceCurrency: 'ARS',
    price: applyBestPromotion(price, productPromos).final,
    availability: `https://schema.org/${availability}`, url,
  });
  const schema = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: product.name, image: product.image_url || undefined, description, url,
    offers: variants.length ? variants.map(v => offer(v.price)) : offer(product.price),
  };

  const handleAdd = () => {
    addToCart({ productId: product.id, productName: product.name,
      variantId: selectedVariant?.id, variantLabel: selectedVariant?.label,
      price: currentPrice, imageUrl: product.image_url || undefined, isCustomizable,
    }, qty);
    setAdded(true);
    setTimeout(() => { setAdded(false); setIsOpen(true); }, 800);
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('¡Enlace copiado!');
    } catch {
      toast.error('No pude copiar el enlace. Copialo desde la barra de direcciones.');
    }
  };

  return (
    <section className="pt-[72px]">
      <SEOHead title={`${product.name} | Le Sucrée Pastelería`} description={description} path={path}
        ogImage={product.image_url || undefined} />
      <Helmet>
        <link rel="canonical" href={url} />
        <meta property="og:url" content={url} />
        <script type="application/ld+json">{JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
      </Helmet>
      <div className="container px-4 py-8 sm:py-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" className="text-warm-gray">
            <Link to="/catalogo"><ArrowLeft /> Catálogo</Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setShowModal(true)} className="text-warm-gray">Vista rápida</Button>
            <Button variant="outline" onClick={copyLink} className="border-warm-gray/30 text-espresso"><Copy /> Copiar enlace</Button>
          </div>
        </div>
        <div className="grid items-start gap-6 md:grid-cols-2 md:gap-10">
          <ProductImage src={product.image_url} alt={product.name} className="w-full aspect-[16/10] sm:aspect-[4/3] object-cover" />
          <div className="min-w-0">
            <span className="text-xs uppercase font-semibold text-warm-gray">{product.category}</span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-espresso mt-1 break-words">{product.name}</h1>
            {product.description && <p className="text-warm-gray mt-3 leading-relaxed">{product.description}</p>}
            {variants.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-warm-gray uppercase mb-2">Tamaño</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map(v => (
                    <Button key={v.id} variant="outline" onClick={() => setSelectedVariant(v)}
                      aria-pressed={selectedVariant?.id === v.id}
                      className={`h-auto whitespace-normal rounded-full px-4 py-2 text-sm font-semibold ${selectedVariant?.id === v.id ? 'bg-dusty-pink text-primary-foreground border-dusty-pink hover:bg-dusty-pink/90' : 'border-dusty-pink text-dusty-pink hover:bg-dusty-pink/10'}`}>
                      {v.label} — {formatPrice(v.price)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 flex items-baseline gap-3 flex-wrap">
              {isCustomizable ? <p className="text-sm text-dusty-pink italic">Consulta con nosotros el diseño y presupuesto final para tu torta</p>
                : behavior.showPrice ? <>
                  <p className="font-body text-2xl font-semibold text-espresso">{formatPrice(currentPrice)}</p>
                  {hasDiscount && <>
                    <span className="text-sm text-warm-gray line-through">{formatPrice(basePrice)}</span>
                    <span className="text-[11px] uppercase font-semibold px-2 py-1 rounded-full bg-dusty-pink/15 text-dusty-pink">
                      {promo?.discount_type === 'percentage' ? `-${promo.discount_value}%` : 'Oferta'}
                    </span>
                  </>}
                </> : <p className="font-body text-base text-warm-gray italic">Precio a confirmar</p>}
              {behavior.publicBadge && <span className="text-[11px] uppercase font-semibold px-2 py-1 rounded-full bg-cream text-espresso border border-espresso/20">{behavior.publicBadge}</span>}
            </div>
            {hasDiscount && promo?.banner_text && <p className="text-xs text-dusty-pink mt-1.5 font-medium">{promo.banner_text}</p>}
            <div className="flex items-center gap-3 mt-4">
              <span className="text-xs font-semibold text-warm-gray uppercase">Cantidad</span>
              <Button variant="outline" size="icon" aria-label="Reducir cantidad" onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-full border-warm-gray/30 text-warm-gray"><Minus /></Button>
              <span className="font-semibold text-espresso w-6 text-center" aria-live="polite">{qty}</span>
              <Button variant="outline" size="icon" aria-label="Aumentar cantidad" onClick={() => setQty(q => q + 1)} className="w-8 h-8 rounded-full border-warm-gray/30 text-warm-gray"><Plus /></Button>
            </div>
            <div className="flex flex-col gap-3 mt-6">
              <Button onClick={handleAdd} disabled={!behavior.canAddToCart}
                className={`h-auto rounded-full px-6 py-3 text-sm font-semibold uppercase whitespace-normal ${added ? 'bg-sage text-primary-foreground' : 'bg-dusty-pink text-primary-foreground hover:bg-mauve'}`}>
                {added ? <><Check /> ¡Agregado!</> : <><ShoppingBag /> {isCustomizable ? 'Continuar Consulta' : 'Agregar al Pedido'}</>}
              </Button>
              <Button asChild variant="outline" className="h-auto rounded-full border-espresso text-espresso px-6 py-3 text-sm font-semibold uppercase whitespace-normal">
                <a href={consultUrl} target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
      {showModal && <ProductDetailModal product={product} variants={variants} onClose={() => setShowModal(false)} />}
    </section>
  );
}

export default function ProductoDetalle() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['product-detail', slug], enabled: !!slug,
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data: product, error } = await supabase.from('products').select('*')
        .eq('slug', slug ?? '').eq('active', true).neq('status', 'oculto')
        .or(`visible_from.is.null,visible_from.lte.${now}`)
        .or(`visible_until.is.null,visible_until.gte.${now}`).maybeSingle();
      if (error) throw error;
      if (!product) return null;
      const { data: variants, error: variantError } = await supabase.from('product_variants')
        .select('*').eq('product_id', product.id).order('sort_order');
      if (variantError) throw variantError;
      return { product, variants: variants ?? [] };
    },
  });
  if (isPending) return <div className="min-h-[60vh] pt-[72px] flex items-center justify-center text-warm-gray">Cargando...</div>;
  if (isError) return <div className="pt-[72px] py-20 text-center text-warm-gray"><p>No pude cargar el producto.</p><Button variant="outline" onClick={() => refetch()} className="mt-4">Reintentar</Button></div>;
  if (!data || !slug) return <><Helmet><meta name="robots" content="noindex" /></Helmet><NotFound /></>;
  return <ProductDetail key={data.product.id} product={data.product} variants={data.variants} slug={slug} />;
}