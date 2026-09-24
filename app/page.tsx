"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import {
  BarChart3,
  Check,
  CircleDollarSign,
  Eye,
  History,
  PackagePlus,
  Printer,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Users,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const products = ["Lens", "Nước ngâm", "Nước nhỏ mắt", "Cốc lens", "Khay lens"];
const statuses = [
  "Chưa thanh toán",
  "Đã thanh toán",
  "Đang giao",
  "Hoàn thành",
  "Hủy đơn",
];
type Item = {
  product: string;
  detail: string;
  quantity: number;
  unitPrice: number;
  discount: number;
};
type Order = {
  id: number;
  orderCode: string;
  customerName: string;
  phone: string;
  address: string;
  salesChannel: string;
  paymentMethod: string;
  status: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  paid: number;
  debt: number;
  note: string;
  createdAt: string;
  items: (Item & { id: number; lineTotal: number })[];
};
const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";
const parseOrderDate = (value: string) => {
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasTimeZone ? value : `${value.replace(" ", "T")}Z`);
};
const vietnamMonthKey = (value: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  return `${year}-${month}`;
};
const vietnamDate = (value: string) =>
  parseOrderDate(value).toLocaleDateString("vi-VN", {
    timeZone: VIETNAM_TIME_ZONE,
  });
const vietnamDateTime = (value: string) =>
  parseOrderDate(value).toLocaleString("vi-VN", {
    timeZone: VIETNAM_TIME_ZONE,
    hour12: false,
  });
const blankItem = (): Item => ({
  product: "Lens",
  detail: "",
  quantity: 1,
  unitPrice: 0,
  discount: 0,
});

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [creatingInvoiceImage, setCreatingInvoiceImage] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return vietnamMonthKey(new Date());
  });
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [meta, setMeta] = useState({
    salesChannel: "Facebook",
    paymentMethod: "Chuyển khoản",
    status: "Chưa thanh toán",
    discount: 0,
    shippingFee: 0,
    paid: 0,
    note: "",
  });
  const [items, setItems] = useState<Item[]>([blankItem()]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/orders?refresh=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setOrders(data.orders);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không tải được đơn hàng",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadOrders();
  }, []);
  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + Math.max(0, item.quantity * item.unitPrice - item.discount),
        0,
      ),
    [items],
  );
  const total = Math.max(0, subtotal - meta.discount + meta.shippingFee);
  const debt = Math.max(0, total - meta.paid);
  useEffect(() => {
    if (meta.status === "Đã thanh toán" && meta.paid !== total) {
      setMeta((current) => ({ ...current, paid: total }));
    }
  }, [meta.paid, meta.status, total]);
  const selectedMonthOrders = orders.filter((order) => {
    return vietnamMonthKey(parseOrderDate(order.createdAt)) === selectedMonth;
  });
  const monthOrders = selectedMonthOrders.filter(
    (order) => order.status.trim() === "Hoàn thành",
  );
  const monthRevenue = monthOrders.reduce((sum, order) => sum + order.total, 0);
  const monthPaid = monthOrders.reduce((sum, order) => sum + order.paid, 0);
  const totalDebt = monthOrders.reduce((sum, order) => sum + order.debt, 0);
  const [selectedYear, selectedMonthNumber] = selectedMonth.split("-");
  const monthLabel = new Date(
    Date.UTC(Number(selectedYear), Number(selectedMonthNumber) - 1, 1, 12),
  ).toLocaleDateString("vi-VN", {
    timeZone: VIETNAM_TIME_ZONE,
    month: "long",
    year: "numeric",
  });
  const filtered = selectedMonthOrders.filter((order) =>
    `${order.orderCode} ${order.customerName} ${order.phone}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  useEffect(() => {
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options?: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: "read_sales_summary",
          title: "Xem tổng quan bán hàng",
          description:
            "Đọc tổng doanh thu, số tiền đã thu, số đơn và công nợ của tháng đang chọn.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          execute: async () => ({
            monthRevenue,
            monthPaid,
            monthOrders: monthOrders.length,
            totalDebt,
            selectedMonth,
          }),
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, [monthRevenue, monthPaid, monthOrders.length, totalDebt, selectedMonth]);
  const updateItem = (index: number, patch: Partial<Item>) =>
    setItems((old) =>
      old.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  const reset = () => {
    setCustomer({ name: "", phone: "", address: "" });
    setMeta({
      salesChannel: "Facebook",
      paymentMethod: "Chuyển khoản",
      status: "Chưa thanh toán",
      discount: 0,
      shippingFee: 0,
      paid: 0,
      note: "",
    });
    setItems([blankItem()]);
  };
  const saveOrder = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerName: customer.name,
          phone: customer.phone,
          address: customer.address,
          ...meta,
          items,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setInvoiceOrder({
        ...data.order,
        createdAt: data.order.createdAt ?? new Date().toISOString(),
        items: items.map((item, index) => ({
          ...item,
          id: -(index + 1),
          lineTotal: Math.max(
            0,
            item.quantity * item.unitPrice - item.discount,
          ),
        })),
      });
      toast.success(`Đã lưu đơn ${data.order.orderCode}`);
      reset();
      await loadOrders();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không lưu được đơn hàng",
      );
    } finally {
      setSaving(false);
    }
  };
  const updateOrderStatus = async (id: number, status: string) => {
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setOrders((current) =>
        current.map((order) =>
          order.id === id
            ? {
                ...order,
                status: data.order.status,
                paid: data.order.paid,
                debt: data.order.debt,
              }
            : order,
        ),
      );
      toast.success(
        status.trim() === "Hoàn thành"
          ? "Đã hoàn thành đơn — doanh thu đã cập nhật"
          : "Đã cập nhật trạng thái đơn",
      );
      await loadOrders();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không cập nhật được đơn hàng",
      );
    }
  };
  const deleteOrder = async (id: number, orderCode: string) => {
    try {
      const response = await fetch(`/api/orders?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(`Đã xóa đơn ${orderCode}`);
      await loadOrders();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không xóa được đơn hàng",
      );
    }
  };
  const copyInvoiceImage = async (order: Order) => {
    const invoice = invoiceRef.current;
    if (!invoice) return;
    setCreatingInvoiceImage(true);
    let captureNode: HTMLDivElement | null = null;
    try {
      const captureWidth = Math.ceil(invoice.getBoundingClientRect().width);
      captureNode = invoice.cloneNode(true) as HTMLDivElement;
      Object.assign(captureNode.style, {
        position: "fixed",
        top: "0",
        left: "-10000px",
        width: `${captureWidth}px`,
        height: "auto",
        maxHeight: "none",
        overflow: "visible",
        backgroundColor: "#ffffff",
        zIndex: "-1",
      });
      document.body.appendChild(captureNode);

      const blob = await toBlob(captureNode, {
        backgroundColor: "#ffffff",
        cacheBust: true,
        pixelRatio: 2,
        width: captureWidth,
        height: captureNode.scrollHeight,
      });
      if (!blob) throw new Error("Không tạo được ảnh");

      if (navigator.clipboard?.write && "ClipboardItem" in window) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        toast.success("Đã sao chép ảnh hóa đơn — bạn có thể dán để gửi khách");
      } else {
        const imageUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = `Lee-Lens-${order.orderCode}.png`;
        link.click();
        URL.revokeObjectURL(imageUrl);
        toast.success("Thiết bị không hỗ trợ sao chép ảnh, đã tải ảnh hóa đơn");
      }
    } catch {
      toast.error("Không thể tạo ảnh hóa đơn. Vui lòng thử lại.");
    } finally {
      captureNode?.remove();
      setCreatingInvoiceImage(false);
    }
  };

  return (
    <main className="app-shell min-h-screen text-slate-950">
      <header className="topbar sticky top-0 z-30">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3.5 md:px-8">
          <div className="flex items-center gap-3.5">
            <span className="brand-mark grid size-11 place-items-center text-white">
              <Eye size={23} />
            </span>
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-xl font-black tracking-[-0.04em]">
                  LEE LENS 1
                </h1>
                <span className="brand-chip hidden sm:inline-flex">STUDIO</span>
              </div>
              <p className="mt-0.5 text-xs font-semibold tracking-wide text-slate-500">
                Bán hàng &amp; doanh thu
              </p>
            </div>
          </div>
          <div className="sync-pill hidden items-center gap-2 px-3.5 py-2 text-sm font-bold sm:flex">
            <span className="size-2 rounded-full bg-emerald-500" />
            Dữ liệu đã đồng bộ
          </div>
        </div>
      </header>
      <div className="content-shell mx-auto max-w-[1440px] px-4 py-6 md:px-8 md:py-8">
        <Tabs defaultValue="sale">
          <TabsList className="nav-tabs mb-6 grid h-auto w-full grid-cols-3 p-1.5 md:w-[560px]">
            <TabsTrigger value="sale" className="gap-2 rounded-xl py-3">
              <ShoppingBag size={17} />
              Tạo đơn
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 rounded-xl py-3">
              <History size={17} />
              Lịch sử
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2 rounded-xl py-3">
              <BarChart3 size={17} />
              Doanh thu
            </TabsTrigger>
          </TabsList>
          <TabsContent value="sale">
            <div className="sale-layout grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <section className="space-y-5">
                <div className="customer-card panel">
                  <div className="section-title">
                    <span className="section-icon">
                      <Users size={18} />
                    </span>
                    <div>
                      <h2>Thông tin khách hàng</h2>
                    </div>
                  </div>
                  <div className="customer-grid grid gap-4 md:grid-cols-3">
                    <Field label="Tên khách hàng *">
                      <Input
                        value={customer.name}
                        onChange={(e) =>
                          setCustomer({ ...customer, name: e.target.value })
                        }
                        placeholder="Nguyễn Thị Mai"
                      />
                    </Field>
                    <Field label="Số điện thoại">
                      <Input
                        value={customer.phone}
                        onChange={(e) =>
                          setCustomer({ ...customer, phone: e.target.value })
                        }
                        placeholder="09xxxxxxxx"
                        inputMode="tel"
                      />
                    </Field>
                    <Field label="Địa chỉ">
                      <Input
                        value={customer.address}
                        onChange={(e) =>
                          setCustomer({ ...customer, address: e.target.value })
                        }
                        placeholder="Địa chỉ giao hàng"
                      />
                    </Field>
                  </div>
                </div>
                <div className="product-card panel overflow-hidden p-0">
                  <div className="product-toolbar section-title border-b border-slate-200/80 px-5 py-4">
                    <span className="section-icon">
                      <PackagePlus size={18} />
                    </span>
                    <div>
                      <h2>Sản phẩm</h2>
                    </div>
                    <Button
                      className="add-item-btn ml-auto"
                      size="sm"
                      variant="outline"
                      onClick={() => setItems([...items, blankItem()])}
                    >
                      <Plus size={16} />
                      Thêm sản phẩm
                    </Button>
                  </div>
                  <div className="product-table-head product-head hidden items-center gap-3 px-5 py-3 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500 md:grid">
                    <span>Sản phẩm</span>
                    <span>Độ cận</span>
                    <span>SL</span>
                    <span>Đơn giá</span>
                    <span>Giảm giá</span>
                    <span />
                  </div>
                  <div className="divide-y divide-slate-100">
                    {items.map((item, index) => (
                      <div
                        key={index}
                        className="product-row grid items-start gap-3 px-5 py-5"
                      >
                        <div className="product-cell" data-label="Sản phẩm">
                          <select
                            className="control"
                            value={item.product}
                            onChange={(e) =>
                              updateItem(index, {
                                product: e.target.value,
                                detail:
                                  e.target.value === "Lens" ? item.detail : "",
                              })
                            }
                          >
                            {products.map((product) => (
                              <option key={product}>{product}</option>
                            ))}
                          </select>
                        </div>
                        <div className="product-cell" data-label="Độ cận">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={item.detail}
                            disabled={item.product !== "Lens"}
                            onChange={(e) =>
                              updateItem(index, { detail: e.target.value })
                            }
                            placeholder={
                              item.product === "Lens"
                                ? "VD: -2.00"
                                : "Không áp dụng"
                            }
                            aria-label={`Độ cận sản phẩm ${index + 1}`}
                          />
                        </div>
                        <div className="product-cell" data-label="Số lượng">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, {
                                quantity: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div className="product-cell" data-label="Đơn giá">
                          <Input
                            type="number"
                            min="0"
                            value={item.unitPrice || ""}
                            onChange={(e) =>
                              updateItem(index, {
                                unitPrice: Number(e.target.value),
                              })
                            }
                            placeholder="0"
                          />
                        </div>
                        <div className="product-cell" data-label="Giảm giá">
                          <Input
                            type="number"
                            min="0"
                            value={item.discount || ""}
                            onChange={(e) =>
                              updateItem(index, {
                                discount: Number(e.target.value),
                              })
                            }
                            placeholder="0"
                          />
                        </div>
                        <Button
                          aria-label="Xóa sản phẩm"
                          variant="ghost"
                          size="icon"
                          className="product-delete delete-btn text-slate-400 hover:text-red-600"
                          disabled={items.length === 1}
                          onClick={() =>
                            setItems(items.filter((_, i) => i !== index))
                          }
                        >
                          <Trash2 size={18} />
                        </Button>
                        <div className="product-row-total line-total">
                          <span>Thành tiền</span>
                          <strong>
                            {money(
                              Math.max(
                                0,
                                item.quantity * item.unitPrice - item.discount,
                              ),
                            )}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
              <aside className="payment-card receipt-card panel h-fit xl:sticky xl:top-28">
                <div className="section-title">
                  <span className="section-icon warm">
                    <CircleDollarSign size={19} />
                  </span>
                  <div>
                    <h2>Thanh toán</h2>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="payment-grid grid gap-3 sm:grid-cols-2">
                    <SelectField
                      label="Kênh bán"
                      value={meta.salesChannel}
                      onChange={(value) =>
                        setMeta({ ...meta, salesChannel: value })
                      }
                      options={[
                        "Facebook",
                        "TikTok",
                        "Shopee",
                        "Cửa hàng",
                        "Khác",
                      ]}
                    />
                    <SelectField
                      label="Phương thức"
                      value={meta.paymentMethod}
                      onChange={(value) =>
                        setMeta({ ...meta, paymentMethod: value })
                      }
                      options={["Tiền mặt", "Chuyển khoản", "COD"]}
                    />
                  </div>
                  <div className="payment-grid grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <SelectField
                        label="Trạng thái thanh toán"
                        value={meta.status}
                        onChange={(value) => setMeta({ ...meta, status: value })}
                        options={["Chưa thanh toán", "Đã thanh toán"]}
                      />
                    </div>
                  </div>
                  <div className="payment-grid grid gap-3 sm:grid-cols-2">
                    <NumberField
                      label="Giảm giá"
                      value={meta.discount}
                      onChange={(value) =>
                        setMeta({ ...meta, discount: value })
                      }
                    />
                    <NumberField
                      label="Phí ship"
                      value={meta.shippingFee}
                      onChange={(value) =>
                        setMeta({ ...meta, shippingFee: value })
                      }
                    />
                  </div>
                  <div className="receipt-lines my-4 space-y-2.5 py-4 text-sm">
                    <Row label="Tiền hàng" value={money(subtotal)} />
                    <Row label="Giảm giá" value={`-${money(meta.discount)}`} />
                    <Row
                      label="Phí giao hàng"
                      value={money(meta.shippingFee)}
                    />
                  </div>
                  <div className="total-card p-5 text-white">
                    <p className="text-sm font-semibold text-blue-100">
                      Khách cần thanh toán
                    </p>
                    <p className="mt-1.5 text-3xl font-black tracking-[-0.04em]">
                      {money(total)}
                    </p>
                    <div className="lens-orbit" />
                  </div>
                  <NumberField
                    label="Đã cọc / đã trả"
                    value={meta.paid}
                    onChange={(value) => setMeta({ ...meta, paid: value })}
                  />
                  <div className="debt-row">
                    <Row
                      label={debt > 0 ? "Còn thiếu" : "Đã thanh toán đủ"}
                      value={money(debt)}
                      alert={debt > 0}
                    />
                  </div>
                  <Button
                    className="save-order-btn mt-1 h-13 w-full text-base font-extrabold"
                    onClick={saveOrder}
                    disabled={saving}
                  >
                    {saving ? (
                      "Đang lưu đơn..."
                    ) : (
                      <>
                        <Check size={19} />
                        Lưu đơn &amp; tạo hóa đơn
                      </>
                    )}
                  </Button>
                </div>
              </aside>
            </div>
          </TabsContent>
          <TabsContent value="history">
            <section className="panel overflow-hidden p-0">
              <div className="history-head flex flex-col gap-3 border-b border-slate-200/80 p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="eyebrow">Đơn hàng</p>
                  <h2 className="text-2xl font-black tracking-tight">
                    Lịch sử bán hàng
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {selectedMonthOrders.length} đơn trong {monthLabel}
                  </p>
                </div>
                <div className="history-filters flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="month"
                    className="month-input"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    aria-label="Chọn tháng xem lịch sử"
                  />
                  <div className="relative">
                    <Search
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <Input
                      className="search-input w-full pl-11 md:w-72"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Tìm mã đơn, tên hoặc SĐT"
                    />
                  </div>
                </div>
              </div>
              <div className="history-table-wrap overflow-x-auto">
                <table className="orders-table w-full min-w-[980px] text-left">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.08em] text-slate-500">
                      <Th>Mã đơn</Th>
                      <Th>Khách hàng</Th>
                      <Th>Sản phẩm</Th>
                      <Th>Tổng tiền</Th>
                      <Th>Đã trả</Th>
                      <Th>Còn thiếu</Th>
                      <Th>Trạng thái</Th>
                      <Th>Ngày tạo</Th>
                      <Th>Thao tác</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="p-10 text-center text-slate-500"
                        >
                          Đang tải dữ liệu...
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="p-10 text-center text-slate-500"
                        >
                          Chưa có đơn hàng phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((order) => (
                        <tr key={order.id} className="order-row">
                          <Td label="Mã đơn">
                            <span className="order-code">
                              {order.orderCode}
                            </span>
                          </Td>
                          <Td label="Khách hàng">
                            <p className="font-bold">{order.customerName}</p>
                            <p className="text-xs text-slate-500">
                              {order.phone || "Không có SĐT"}
                            </p>
                          </Td>
                          <Td label="Sản phẩm">
                            {order.items
                              .map(
                                (item) =>
                                  `${item.product}${
                                    item.product === "Lens" && item.detail
                                      ? ` (${item.detail})`
                                      : ""
                                  } ×${item.quantity}`,
                              )
                              .join(", ")}
                          </Td>
                          <Td label="Tổng tiền" strong>
                            {money(order.total)}
                          </Td>
                          <Td label="Đã trả">{money(order.paid)}</Td>
                          <Td label="Còn thiếu" alert={order.debt > 0}>
                            {money(order.debt)}
                          </Td>
                          <Td label="Trạng thái">
                            <select
                              className={`history-status-select ${order.status === "Hoàn thành" || order.status === "Đã thanh toán" ? "ok" : order.status === "Hủy đơn" ? "cancel" : "pending"}`}
                              value={order.status}
                              onChange={(event) =>
                                updateOrderStatus(order.id, event.target.value)
                              }
                              aria-label={`Trạng thái đơn ${order.orderCode}`}
                            >
                              {statuses.map((status) => (
                                <option key={status}>{status}</option>
                              ))}
                            </select>
                          </Td>
                          <Td label="Ngày tạo">
                            {vietnamDate(order.createdAt)}
                          </Td>
                          <Td label="Thao tác">
                            <div className="order-actions flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="print-order-btn"
                                onClick={() => setInvoiceOrder(order)}
                              >
                                <Printer size={15} />
                                In đơn
                              </Button>
                              {order.status === "Hủy đơn" && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="delete-order-btn"
                                    >
                                      <Trash2 size={15} />
                                      Xóa
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Xóa đơn {order.orderCode}?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Đơn hàng và các sản phẩm trong đơn sẽ bị
                                        xóa khỏi lịch sử. Doanh thu sẽ được tính
                                        lại ngay sau đó.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Giữ lại
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        variant="destructive"
                                        onClick={() =>
                                          deleteOrder(order.id, order.orderCode)
                                        }
                                      >
                                        Xóa đơn
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </TabsContent>
          <TabsContent value="dashboard">
            <div className="revenue-toolbar mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow">Báo cáo theo tháng</p>
                <h2 className="text-xl font-black capitalize">{monthLabel}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Chỉ tính đơn có trạng thái Hoàn thành · Đã thanh toán chưa tính đến khi hoàn tất giao
                </p>
              </div>
              <Input
                type="month"
                className="month-input"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Chọn tháng xem doanh thu"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Metric
                icon={<CircleDollarSign />}
                label="Tổng doanh thu tháng"
                value={money(monthRevenue)}
                tone="blue"
              />
              <Metric
                icon={<BarChart3 />}
                label="Đã thu trong tháng"
                value={money(monthPaid)}
                tone="orange"
              />
              <Metric
                icon={<ShoppingBag />}
                label="Đơn trong tháng"
                value={`${monthOrders.length} đơn`}
                tone="green"
              />
              <Metric
                icon={<History />}
                label="Còn thiếu trong tháng"
                value={money(totalDebt)}
                tone="red"
              />
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
              <section className="panel">
                <div className="section-title">
                  <BarChart3 size={20} />
                  <h2>7 đơn gần nhất trong tháng</h2>
                </div>
                <div className="space-y-3">
                  {monthOrders.slice(0, 7).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                    >
                      <div className="grid size-10 place-items-center rounded-xl bg-blue-50 font-bold text-blue-700">
                        {order.customerName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {order.customerName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {order.orderCode} · {vietnamDate(order.createdAt)}
                        </p>
                      </div>
                      <p className="font-extrabold">{money(order.total)}</p>
                    </div>
                  ))}
                  {!monthOrders.length && (
                    <p className="py-10 text-center text-slate-500">
                      Doanh thu sẽ xuất hiện sau khi bạn lưu đơn đầu tiên.
                    </p>
                  )}
                </div>
              </section>
              <section className="panel">
                <div className="section-title">
                  <ShoppingBag size={20} />
                  <h2>Cơ cấu sản phẩm</h2>
                </div>
                <ProductBreakdown orders={monthOrders} />
              </section>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Dialog
        open={Boolean(invoiceOrder)}
        onOpenChange={(open) => !open && setInvoiceOrder(null)}
      >
        <DialogContent className="invoice-dialog max-h-[92vh] max-w-2xl overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Hóa đơn Lee Lens 1</DialogTitle>
            <DialogDescription>
              Xem, sao chép hoặc in hóa đơn gửi khách hàng.
            </DialogDescription>
          </DialogHeader>
          {invoiceOrder && (
            <div ref={invoiceRef} className="invoice-capture">
              <Invoice order={invoiceOrder} />
            </div>
          )}
          {invoiceOrder && (
            <DialogFooter className="invoice-actions border-t border-slate-200 bg-slate-50 p-4 sm:justify-between">
              <Button
                variant="outline"
                disabled={creatingInvoiceImage}
                onClick={() => copyInvoiceImage(invoiceOrder)}
              >
                <ImageIcon size={17} />
                {creatingInvoiceImage ? "Đang tạo ảnh..." : "Sao chép ảnh"}
              </Button>
              <Button onClick={() => window.print()}>
                <Printer size={17} />
                In hóa đơn
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      <Toaster richColors position="top-right" />
    </main>
  );
}

function Invoice({ order }: { order: Order }) {
  const paymentComplete = order.debt <= 0;
  return (
    <article className="invoice-print bg-white text-slate-900">
      <div className="invoice-accent" />
      <div className="invoice-body">
        <header className="invoice-header flex items-start justify-between gap-5">
          <div className="flex items-center gap-3">
            <span className="invoice-brand-mark grid size-11 place-items-center text-white">
              <Eye size={23} />
            </span>
            <div>
              <p className="invoice-brand-name">LEE LENS 1</p>
              <p className="invoice-subtitle">PHIẾU XÁC NHẬN ĐƠN HÀNG</p>
            </div>
          </div>
          <div className="invoice-code-block text-right">
            <p>MÃ ĐƠN HÀNG</p>
            <strong>{order.orderCode}</strong>
            <span>{vietnamDateTime(order.createdAt)}</span>
          </div>
        </header>

        <section className="invoice-meta-grid">
          <div className="invoice-info-card invoice-customer-card">
            <p className="invoice-section-label">THÔNG TIN KHÁCH HÀNG</p>
            <strong className="invoice-customer-name">
              {order.customerName}
            </strong>
            <div className="invoice-info-lines">
              <p>
                <span>Số điện thoại</span>
                <strong>{order.phone || "—"}</strong>
              </p>
              <p>
                <span>Địa chỉ</span>
                <strong>{order.address || "—"}</strong>
              </p>
            </div>
          </div>
          <div className="invoice-info-card">
            <p className="invoice-section-label">THANH TOÁN</p>
            <div className="invoice-info-lines">
              <p>
                <span>Phương thức</span>
                <strong>{order.paymentMethod}</strong>
              </p>
              <p>
                <span>Kênh bán</span>
                <strong>{order.salesChannel}</strong>
              </p>
              <p>
                <span>Trạng thái</span>
                <strong
                  className={paymentComplete ? "invoice-paid" : "invoice-due"}
                >
                  {paymentComplete ? "Đã thanh toán" : "Chưa thanh toán đủ"}
                </strong>
              </p>
            </div>
          </div>
        </section>

        <section className="invoice-products">
          <p className="invoice-section-label">CHI TIẾT SẢN PHẨM</p>
          <div className="invoice-items">
            <div className="invoice-item invoice-item-head">
              <span>Sản phẩm</span>
              <span>SL</span>
              <span>Đơn giá</span>
              <span>Giảm</span>
              <span>Thành tiền</span>
            </div>
            {order.items.map((item) => (
              <div className="invoice-item" key={item.id}>
                <div className="invoice-product-name">
                  <strong>{item.product}</strong>
                  {item.product === "Lens" && item.detail && (
                    <span>Độ cận: {item.detail}</span>
                  )}
                </div>
                <span>{item.quantity}</span>
                <span>{money(item.unitPrice)}</span>
                <span>
                  {item.discount > 0 ? `-${money(item.discount)}` : "—"}
                </span>
                <strong>{money(item.lineTotal)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="invoice-bottom-grid">
          <div className="invoice-note">
            <p className="invoice-section-label">GHI CHÚ</p>
            <p>
              {order.note ||
                "Vui lòng kiểm tra thông tin đơn hàng trước khi nhận hàng."}
            </p>
          </div>
          <div className="invoice-summary">
            <Row label="Tiền hàng" value={money(order.subtotal)} />
            <Row
              label="Giảm giá đơn hàng"
              value={`-${money(order.discount)}`}
            />
            <Row label="Phí giao hàng" value={money(order.shippingFee)} />
            <div className="invoice-grand-total">
              <span>TỔNG THANH TOÁN</span>
              <strong>{money(order.total)}</strong>
            </div>
            <Row label="Đã cọc / đã trả" value={money(order.paid)} />
            <Row
              label="Còn thiếu"
              value={money(order.debt)}
              alert={order.debt > 0}
            />
          </div>
        </section>
        <footer className="invoice-footer">
          <strong>Cảm ơn bạn đã tin chọn Lee Lens 1!</strong>
          <span>Phiếu được tạo tự động theo thông tin đơn hàng đã lưu.</span>
        </footer>
      </div>
    </article>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="form-field block min-w-0 space-y-2">
      <span className="form-label block text-sm font-bold text-slate-700">
        {label}
      </span>
      <span className="form-control-wrap block min-w-0">{children}</span>
    </label>
  );
}
function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <Field label={label}>
      <select
        className="control"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </Field>
  );
}
function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        min="0"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder="0"
      />
    </Field>
  );
}
function Row({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={alert ? "font-bold text-red-600" : "text-slate-600"}>
        {label}
      </span>
      <strong className={alert ? "text-red-600" : "text-slate-950"}>
        {value}
      </strong>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-5 py-3 font-bold">{children}</th>;
}
function Td({
  children,
  strong = false,
  alert = false,
  label,
}: {
  children: React.ReactNode;
  strong?: boolean;
  alert?: boolean;
  label?: string;
}) {
  return (
    <td
      data-label={label}
      className={`px-5 py-4 text-sm ${strong ? "font-extrabold" : ""} ${alert ? "font-bold text-red-600" : ""}`}
    >
      {children}
    </td>
  );
}
function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={`metric ${tone}`}>
      <div className="metric-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
function ProductBreakdown({ orders }: { orders: Order[] }) {
  const counts = products.map((product) => ({
    product,
    count: orders
      .flatMap((order) => order.items)
      .filter((item) => item.product === product)
      .reduce((sum, item) => sum + item.quantity, 0),
  }));
  const max = Math.max(1, ...counts.map((item) => item.count));
  return (
    <div className="space-y-4">
      {counts.map((item) => (
        <div key={item.product}>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="font-semibold">{item.product}</span>
            <strong>{item.count}</strong>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#ef7f5a]"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
