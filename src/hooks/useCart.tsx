import { createContext, ReactNode, useContext, useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart
  })

  const cartPreviousValue = prevCartRef.current ?? cart

  useEffect(() => {
    if (cartPreviousValue !== cart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {
      const cartProducts = [...cart]

      const productExists = cartProducts.find(product => product.id === productId)
      const cartProductAmount = productExists ? productExists.amount : 0
      const cartProductNewAmount = cartProductAmount + 1

      const stockProduct = await api.get(`stock/${productId}`)
      const stockProductAmount = stockProduct.data.amount

      if (cartProductNewAmount > stockProductAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      if (productExists) {
        productExists.amount = cartProductNewAmount
      } else {
        const product = await api.get(`products/${productId}`)

        const addedProduct = { ...product.data, amount: 1 }

        cartProducts.push(addedProduct)
      }

      setCart(cartProducts)
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartProducts = [...cart]
      const removedProductIndex = cartProducts.findIndex(product => product.id === productId)

      if (removedProductIndex >= 0) {
        cartProducts.splice(removedProductIndex, 1)
        setCart(cartProducts)
      }
      else
        throw Error()
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        throw Error()
      }

      const stockProduct = await api.get(`stock/${productId}`)
      const stockProductAmount = stockProduct.data.amount

      if (amount > stockProductAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const cartProducts = [...cart]

      const productExists = cartProducts.find(product => product.id === productId)
      if (productExists) {
        productExists.amount = amount

        setCart(cartProducts)
      } else
        throw Error()

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
