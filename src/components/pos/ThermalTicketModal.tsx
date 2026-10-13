'use client';

type ThermalTicketModalProps = Readonly<{
  isOpen: boolean;
  folio: string;
  items: Array<{ nombre: string; cantidad: number; precio: number }>;
  total: number;
  metodoPago: string;
  onNewSale: () => void;
}>;

export default function ThermalTicketModal({
  isOpen,
  folio,
  items,
  total,
  metodoPago,
  onNewSale,
}: ThermalTicketModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 bg-black/90 backdrop-blur-md">
      <div className="max-w-md w-full bg-white text-black p-6 rounded-xl text-left shadow-2xl font-mono text-xs space-y-3">
        <div className="text-center border-b border-dashed border-black pb-3">
          <h2 className="text-base font-black uppercase">CINE TEATRO XILOTZIN</h2>
          <p className="text-[10px] font-bold uppercase mt-1">TICKET DE VENTA OFICIAL</p>
          <p className="text-[9px]">FOLIO: {folio}</p>
        </div>

        <div className="space-y-1">
          {items.map((i) => (
            <div key={`${i.nombre}-${i.precio}`} className="flex justify-between">
              <span>
                {i.cantidad}x {i.nombre.substring(0, 22)}
              </span>
              <span className="font-bold">${i.precio * i.cantidad}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-black pt-2 flex justify-between font-black text-sm">
          <span>TOTAL:</span>
          <span>${total}.00 MXN</span>
        </div>

        <div className="text-[9px] text-center pt-1">
          <span>MÉTODO: </span>
          <span className="font-bold uppercase">{metodoPago}</span>
        </div>

        <div className="pt-4 flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 bg-black text-white font-bold py-2.5 rounded-lg uppercase text-[10px]"
          >
            Imprimir
          </button>
          <button
            type="button"
            onClick={onNewSale}
            className="flex-1 bg-[#D81B60] text-white font-bold py-2.5 rounded-lg uppercase text-[10px]"
          >
            Nueva Venta
          </button>
        </div>
      </div>
    </div>
  );
}