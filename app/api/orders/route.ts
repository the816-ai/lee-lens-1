import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { orderItems, orders } from "../../../db/schema";

type ItemInput = {
  product?: string;
  detail?: string;
  quantity?: number;
  unitPrice?: number;
  discount?: number;
};
function message(error: unknown) {
  const text =
    error instanceof Error ? error.message : "Không thể xử lý dữ liệu";
  return text.includes("no such table")
    ? "Kho dữ liệu đang được khởi tạo. Vui lòng thử lại sau ít phút."
    : text;
}

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(500);
    const ids = rows.map((row) => row.id);
    const items = ids.length
      ? await db
          .select()
          .from(orderItems)
          .where(inArray(orderItems.orderId, ids))
      : [];
    return Response.json(
      {
        orders: rows.map((row) => ({
          ...row,
          items: items.filter((item) => item.orderId === row.id),
        })),
      },
      {
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      customerName?: string;
      phone?: string;
      address?: string;
      salesChannel?: string;
      paymentMethod?: string;
      status?: string;
      discount?: number;
      shippingFee?: number;
      paid?: number;
      note?: string;
      items?: ItemInput[];
    };
    const customerName = payload.customerName?.trim() ?? "";
    const cleanItems = (payload.items ?? []).filter(
      (item) =>
        item.product &&
        Number(item.quantity) > 0 &&
        Number(item.unitPrice) >= 0,
    );
    if (!customerName)
      return Response.json(
        { error: "Vui lòng nhập tên khách hàng." },
        { status: 400 },
      );
    if (!cleanItems.length)
      return Response.json(
        { error: "Vui lòng thêm ít nhất một sản phẩm." },
        { status: 400 },
      );
    const subtotal = cleanItems.reduce(
      (sum, item) =>
        sum +
        Math.max(
          0,
          Number(item.quantity) * Number(item.unitPrice) -
            Number(item.discount ?? 0),
        ),
      0,
    );
    const discount = Math.max(0, Number(payload.discount ?? 0));
    const shippingFee = Math.max(0, Number(payload.shippingFee ?? 0));
    const total = Math.max(0, subtotal - discount + shippingFee);
    const paid = Math.max(0, Number(payload.paid ?? 0));
    const debt = Math.max(0, total - paid);
    const db = getDb();
    const [order] = await db
      .insert(orders)
      .values({
        orderCode: `DH-${Date.now().toString().slice(-8)}`,
        customerName,
        phone: payload.phone?.trim() ?? "",
        address: payload.address?.trim() ?? "",
        salesChannel: payload.salesChannel ?? "Facebook",
        paymentMethod: payload.paymentMethod ?? "Chuyển khoản",
        status:
          payload.status?.trim() ||
          (debt > 0 ? "Chưa thanh toán" : "Đã thanh toán"),
        subtotal,
        discount,
        shippingFee,
        total,
        paid,
        debt,
        note: payload.note?.trim() ?? "",
      })
      .returning();
    await db.insert(orderItems).values(
      cleanItems.map((item) => ({
        orderId: order.id,
        product: item.product!,
        detail: item.detail?.trim() ?? "",
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount ?? 0),
        lineTotal: Math.max(
          0,
          Number(item.quantity) * Number(item.unitPrice) -
            Number(item.discount ?? 0),
        ),
      })),
    );
    return Response.json({ order }, { status: 201 });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as {
      id?: number;
      status?: string;
      paid?: number;
    };
    if (!payload.id)
      return Response.json({ error: "Thiếu mã đơn hàng." }, { status: 400 });
    const db = getDb();
    const [current] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, payload.id))
      .limit(1);
    if (!current)
      return Response.json(
        { error: "Không tìm thấy đơn hàng." },
        { status: 404 },
      );
    const paid =
      payload.paid === undefined
        ? current.paid
        : Math.max(0, Number(payload.paid));
    const status = payload.status?.trim() || current.status;
    const [updated] = await db
      .update(orders)
      .set({
        status,
        paid,
        debt: Math.max(0, current.total - paid),
      })
      .where(eq(orders.id, payload.id))
      .returning();
    return Response.json({ order: updated });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0)
      return Response.json(
        { error: "Mã đơn hàng không hợp lệ." },
        { status: 400 },
      );
    const db = getDb();
    const [current] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);
    if (!current)
      return Response.json(
        { error: "Không tìm thấy đơn hàng." },
        { status: 404 },
      );
    if (current.status !== "Hủy đơn")
      return Response.json(
        { error: "Chỉ có thể xóa đơn đã hủy." },
        { status: 409 },
      );
    await db.delete(orderItems).where(eq(orderItems.orderId, id));
    await db.delete(orders).where(eq(orders.id, id));
    return Response.json({ deleted: true, id });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}
