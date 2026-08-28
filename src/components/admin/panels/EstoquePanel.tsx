"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/TextInput";
import { Toggle } from "@/components/ui/Toggle";
import { fmtMoney } from "@/lib/business/format";
import { addProduct, deleteProduct, restockProduct, sellProduct, setProductShowInBooking } from "@/lib/actions/admin";
import type { AdminData } from "../AdminApp";

export function EstoquePanel({ products }: AdminData) {
  const router = useRouter();
  const lowStock = products.filter((p) => p.stock <= p.min_stock);

  const [sellingId, setSellingId] = useState<string | null>(null);
  const [sellQty, setSellQty] = useState(1);
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState(1);
  const [newProduct, setNewProduct] = useState({ name: "", stock: "", minStock: "5", price: "", cost: "" });
  const [submitting, setSubmitting] = useState(false);

  const confirmSell = async (productId: string, stock: number) => {
    const qty = Math.min(sellQty, stock);
    if (qty <= 0) return;
    await sellProduct(productId, qty);
    setSellingId(null);
    setSellQty(1);
    router.refresh();
  };

  const confirmRestock = async (productId: string) => {
    if (restockQty <= 0) return;
    await restockProduct(productId, restockQty);
    setRestockingId(null);
    setRestockQty(1);
    router.refresh();
  };

  const submitNewProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.price) return;
    setSubmitting(true);
    await addProduct({
      name: newProduct.name.trim(),
      stock: parseInt(newProduct.stock) || 0,
      minStock: parseInt(newProduct.minStock) || 5,
      price: parseFloat(newProduct.price),
      cost: parseFloat(newProduct.cost) || 0,
    });
    setSubmitting(false);
    setNewProduct({ name: "", stock: "", minStock: "5", price: "", cost: "" });
    router.refresh();
  };

  return (
    <div className="anim-step max-w-3xl mx-auto">
      <h1 className="text-2xl mb-6 font-heading text-cream">Estoque</h1>

      {lowStock.length > 0 && (
        <Card className="mb-6 flex items-center gap-2" style={{ borderColor: "var(--danger)" }}>
          <AlertCircle size={16} className="text-danger shrink-0" />
          <span className="text-sm text-danger font-body">Estoque baixo: {lowStock.map((p) => p.name).join(", ")}</span>
        </Card>
      )}

      <div className="space-y-2 mb-6">
        {products.map((p) => (
          <Card key={p.id}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-cream font-body">{p.name}</div>
                <div className="text-xs text-muted font-body">
                  {p.stock} em estoque (mín. {p.min_stock}) · venda {fmtMoney(p.price)}
                  {p.cost > 0 && <> · custo {fmtMoney(p.cost)}</>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setSellingId(sellingId === p.id ? null : p.id)}>
                  Vender
                </Button>
                <Button variant="ghost" onClick={() => setRestockingId(restockingId === p.id ? null : p.id)}>
                  Repor
                </Button>
                <button
                  onClick={async () => {
                    await deleteProduct(p.id);
                    router.refresh();
                  }}
                  className="text-danger press-scale"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-line">
              <Toggle
                checked={p.show_in_booking !== false}
                onChange={async (v) => {
                  await setProductShowInBooking(p.id, v);
                  router.refresh();
                }}
                label="Aparece pro cliente na hora de agendar"
              />
            </div>
            {sellingId === p.id && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line anim-pop">
                <TextInput type="number" min={1} max={p.stock} value={sellQty} onChange={(e) => setSellQty(parseInt(e.target.value) || 1)} className="w-20" />
                <Button variant="primary" onClick={() => confirmSell(p.id, p.stock)}>
                  Confirmar venda
                </Button>
              </div>
            )}
            {restockingId === p.id && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line anim-pop">
                <TextInput type="number" min={1} value={restockQty} onChange={(e) => setRestockQty(parseInt(e.target.value) || 1)} className="w-20" />
                <Button variant="brass" onClick={() => confirmRestock(p.id)}>
                  Confirmar reposição
                </Button>
              </div>
            )}
          </Card>
        ))}
        {products.length === 0 && <p className="text-muted font-body">Nenhum produto cadastrado.</p>}
      </div>

      <Card>
        <h3 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">Novo produto</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nome">
            <TextInput value={newProduct.name} onChange={(e) => setNewProduct((s) => ({ ...s, name: e.target.value }))} />
          </Field>
          <Field label="Preço de venda">
            <TextInput type="number" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct((s) => ({ ...s, price: e.target.value }))} />
          </Field>
          <Field label="Custo (opcional)">
            <TextInput type="number" step="0.01" value={newProduct.cost} onChange={(e) => setNewProduct((s) => ({ ...s, cost: e.target.value }))} />
          </Field>
          <Field label="Estoque inicial">
            <TextInput type="number" value={newProduct.stock} onChange={(e) => setNewProduct((s) => ({ ...s, stock: e.target.value }))} />
          </Field>
          <Field label="Estoque mínimo">
            <TextInput type="number" value={newProduct.minStock} onChange={(e) => setNewProduct((s) => ({ ...s, minStock: e.target.value }))} />
          </Field>
        </div>
        <Button variant="primary" className="flex items-center gap-1.5" disabled={submitting} onClick={submitNewProduct}>
          <Plus size={14} /> Adicionar produto
        </Button>
      </Card>
    </div>
  );
}
