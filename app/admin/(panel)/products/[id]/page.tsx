import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductForm productId={id} />;
}
