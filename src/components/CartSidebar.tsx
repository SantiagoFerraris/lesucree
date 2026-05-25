import { X, Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/formatPrice';
import ProductImage from '@/components/ProductImage';

export default function CartSidebar() {
  const { items, removeFromCart, updateQuantity, clearCart, getCartTotal, getCartCount, isOpen, setIsOpen } = useCart();

  if (!isOpen) return null;

  const hasCustomizable = items.some(i => i.isCustomizable);

  return (
    <>
      <div className="fixed inset-0 z-[9990] bg-espresso/40 backdrop-blur-sm animate-fade-in" onClick={() => setIsOpen(false)} />
      <div className="fixed top-0 right-0 bottom-0 z-[9991] w-full max-w-md bg-soft-white shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-blush">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-espresso" />
            <h2 className="font-display text-lg font-bold text-espresso">Tu Pedido</h2>
            <span className="text-xs text-warm-gray">({getCartCount()} items)</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-full hover:bg-blush transition-colors text-espresso" aria-label="Cerrar carrito">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag size={40} className="mx-auto text-warm-gray/40 mb-4" />
              <p className="text-warm-gray font-body">Tu carrito está vacío</p>
              <Link
                to="/catalogo"
                onClick={() => setIsOpen(false)}
                className="inline-block mt-4 text-dusty-pink hover:text-mauve font-semibold text-sm transition-colors"
              >
                Ver catálogo →
              </Link>
            </div>
          ) : (
            <>
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantId || ''}`} className="flex gap-3 bg-white rounded-xl p-3 shadow-sm">
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <ProductImage src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-espresso truncate">{item.productName}</h4>
                    {item.variantLabel && <p className="text-xs text-warm-gray">{item.variantLabel}</p>}
                    {item.isCustomizable ? (
                      <p className="text-sm text-warm-gray italic mt-1">Presupuesto a confirmar</p>
                    ) : (
                      <p className="text-sm font-semibold text-espresso mt-1">{formatPrice(item.price)}</p>
                    )}
                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                          aria-label="Disminuir cantidad"
                          className="w-11 h-11 -m-2.5 flex items-center justify-center text-warm-gray hover:text-dusty-pink transition-colors"
                        >
                          <span className="w-6 h-6 rounded-full border border-warm-gray/30 flex items-center justify-center">
                            <Minus size={12} />
                          </span>
                        </button>
                        <span className="text-sm font-semibold text-espresso w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                          aria-label="Aumentar cantidad"
                          className="w-11 h-11 -m-2.5 flex items-center justify-center text-warm-gray hover:text-dusty-pink transition-colors"
                        >
                          <span className="w-6 h-6 rounded-full border border-warm-gray/30 flex items-center justify-center">
                            <Plus size={12} />
                          </span>
                        </button>
                      </div>
                      <p className="text-sm font-bold text-espresso whitespace-nowrap">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId, item.variantId)}
                    className="p-1 text-warm-gray/50 hover:text-red-500 transition-colors self-start"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={clearCart}
                className="block mx-auto text-xs text-warm-gray/60 hover:text-red-500 transition-colors mt-2"
              >
                Vaciar carrito
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-5 border-t border-blush space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-body text-warm-gray">Total:</span>
              <span className="font-display text-xl font-bold text-espresso">{formatPrice(getCartTotal())}</span>
            </div>
            <Link
              to="/pedido"
              onClick={() => setIsOpen(false)}
              className="block w-full text-center rounded-full bg-dusty-pink text-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] hover:bg-mauve transition-all active:scale-95"
            >
              Confirmar Pedido
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="w-full rounded-full border border-dusty-pink text-dusty-pink px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] hover:bg-dusty-pink hover:text-white transition-all active:scale-95"
            >
              Seguir Comprando
            </button>
          </div>
        )}
      </div>
    </>
  );
}
