/**
 * Editar, agregar y eliminar ítems y campos antes de consolidar (FR-006, AC-12).
 *
 * Separado de React para poder probarlo sin montar un navegador. La regla que importa:
 * **editar un campo estimado lo convierte en declarado**, y eso dispara el recálculo. Es la vía
 * por la que se corrige una entrada de catálogo mal asociada.
 */

import type { Campo, IndiceColor, Item, MarcasItem } from '../dominio/items'
import type { Gramos, Milimetros } from '../dominio/unidades'

export type CampoEditable = 'cantidad' | 'largo' | 'ancho' | 'alto' | 'pesoUnitario'

/**
 * Escribe un valor en un campo. Queda **declarado**: pierde la marca de estimado y la entrada
 * de catálogo de la que venía.
 *
 * Un valor fuera de rango no se escribe: deja el campo faltante con el motivo, igual que si
 * hubiera venido así del modelo (FR-021). No se corrige por su signo ni por su valor absoluto.
 */
export function editarCampo(item: Item, campo: CampoEditable, valor: number): Item {
  const valido =
    campo === 'cantidad' ? Number.isInteger(valor) && valor >= 1 : Number.isFinite(valor) && valor > 0

  const nuevo: Campo<number> = valido
    ? { estado: 'declarado', valor }
    : { estado: 'faltante', motivo: 'valor-fuera-de-rango' }

  if (campo === 'cantidad') return { ...item, cantidad: nuevo }
  if (campo === 'pesoUnitario') return { ...item, pesoUnitario: nuevo as Campo<Gramos> }
  return { ...item, [campo]: nuevo as Campo<Milimetros> }
}

/** Borrar un campo lo deja faltante, no en cero. */
export function borrarCampo(item: Item, campo: CampoEditable): Item {
  const vacio: Campo<never> = { estado: 'faltante', motivo: 'entrada-sin-el-dato' }
  if (campo === 'cantidad') return { ...item, cantidad: vacio }
  if (campo === 'pesoUnitario') return { ...item, pesoUnitario: vacio }
  return { ...item, [campo]: vacio }
}

/**
 * Cambia una marca de FR-008.
 *
 * Una marca que venía del catálogo pasa a `declarado` cuando el usuario la toca: el catálogo la
 * sugirió, la persona decidió.
 */
export function marcarItem(
  item: Item,
  marca: 'noApilable' | 'orientacionObligatoria',
  valor: boolean,
): Item {
  const marcas: MarcasItem = { ...item.marcas, [marca]: { estado: 'declarado', valor } }
  return { ...item, marcas }
}

/** El peso máximo admitido encima. **Siempre** lo declara el usuario (FR-008). */
export function declararPesoMaximoEncima(item: Item, gramos: number | null): Item {
  const campo: Campo<Gramos> =
    gramos === null
      ? { estado: 'faltante', motivo: 'entrada-sin-el-dato' }
      : Number.isFinite(gramos) && gramos > 0
        ? { estado: 'declarado', valor: gramos as Gramos }
        : { estado: 'faltante', motivo: 'valor-fuera-de-rango' }

  return { ...item, marcas: { ...item.marcas, pesoMaximoEncima: campo } }
}

/**
 * Un ítem nuevo, agregado a mano.
 *
 * Todos sus campos arrancan **faltantes**, nunca estimados: el estado estimado solo lo produce
 * el completado desde el catálogo. Lo que el usuario escriba queda declarado.
 */
export function itemEnBlanco(nombre: string, indice: number): Item {
  const falta: Campo<never> = { estado: 'faltante', motivo: 'sin-entrada-en-catalogo' }
  return {
    id: `item-${indice}`,
    nombre,
    cantidad: falta,
    largo: falta,
    ancho: falta,
    alto: falta,
    pesoUnitario: falta,
    marcas: {
      noApilable: { estado: 'declarado', valor: false },
      orientacionObligatoria: { estado: 'declarado', valor: false },
      pesoMaximoEncima: falta,
    },
    color: (indice % 12) as IndiceColor,
  }
}
