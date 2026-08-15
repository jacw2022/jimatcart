import { useEffect, useRef, useState } from "react";
import type {
  BasketDraftErrors,
  EditableBasketItem,
  EditableShop,
} from "./basketDraft";

interface ItemOfferEditorProps {
  items: EditableBasketItem[];
  shops: EditableShop[];
  errors: BasketDraftErrors;
  showErrors: boolean;
  onAdd: () => void;
  onRemove: (itemId: string) => void;
  onItemChange: (
    itemId: string,
    updates: Partial<EditableBasketItem>,
  ) => void;
  onPriceChange: (itemId: string, shopId: string, value: string) => void;
  onUnavailableChange: (
    itemId: string,
    shopId: string,
    unavailable: boolean,
  ) => void;
  onPriceBlur: (itemId: string, shopId: string) => void;
}

function joinDescribedBy(...ids: Array<string | false | undefined>): string | undefined {
  const value = ids.filter(Boolean).join(" ");
  return value || undefined;
}

function GroceryNameField({
  item,
  itemIndex,
  itemName,
  error,
  availabilityError,
  onItemChange,
  autoEdit,
}: {
  item: EditableBasketItem;
  itemIndex: number;
  itemName: string;
  error?: string;
  availabilityError?: string;
  onItemChange: ItemOfferEditorProps["onItemChange"];
  autoEdit: boolean;
}) {
  const [editing, setEditing] = useState(autoEdit || !item.name.trim());
  const inputRef = useRef<HTMLInputElement>(null);
  const nameId = `${item.id}-name`;
  const errorId = `${item.id}-name-error`;
  const availId = `${item.id}-avail-error`;
  const describedBy = joinDescribedBy(
    error && errorId,
    availabilityError && availId,
  );

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (!editing) {
    return (
      <div className="grocery-name">
        <button
          type="button"
          id={nameId}
          className="grocery-name__display"
          onClick={() => setEditing(true)}
          aria-label={`Edit name for ${itemName}`}
          aria-invalid={Boolean(error || availabilityError)}
          aria-describedby={describedBy}
        >
          {itemName}
        </button>
        {error && (
          <span className="field-error" id={errorId}>
            {error}
          </span>
        )}
        {availabilityError && (
          <span className="field-error" id={availId}>
            {availabilityError}
          </span>
        )}
      </div>
    );
  }

  return (
    <label className="table-field grocery-name grocery-name--editing">
      <span className="mobile-field-label">Item name</span>
      <input
        ref={inputRef}
        id={nameId}
        type="text"
        value={item.name}
        placeholder="e.g. Jasmine rice"
        aria-label={`Item ${itemIndex + 1} name`}
        aria-invalid={Boolean(error || availabilityError)}
        aria-describedby={describedBy}
        onChange={(event) =>
          onItemChange(item.id, { name: event.target.value })
        }
        onBlur={() => {
          if (item.name.trim()) setEditing(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            (event.target as HTMLInputElement).blur();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            if (item.name.trim()) setEditing(false);
          }
        }}
      />
      {error && (
        <span className="field-error" id={errorId}>
          {error}
        </span>
      )}
      {availabilityError && (
        <span className="field-error" id={availId}>
          {availabilityError}
        </span>
      )}
    </label>
  );
}

function ShopPriceField({
  item,
  itemName,
  shop,
  shops,
  priceError,
  availabilityError,
  showErrors,
  onPriceChange,
  onUnavailableChange,
  onPriceBlur,
}: {
  item: EditableBasketItem;
  itemName: string;
  shop: EditableShop;
  shops: EditableShop[];
  priceError?: string;
  availabilityError?: string;
  showErrors: boolean;
  onPriceChange: ItemOfferEditorProps["onPriceChange"];
  onUnavailableChange: ItemOfferEditorProps["onUnavailableChange"];
  onPriceBlur: ItemOfferEditorProps["onPriceBlur"];
}) {
  const shopName = shop.name.trim() || "Unnamed shop";
  const priceValue = item.priceInputsByStoreId[shop.id] ?? "";
  const unavailable = Boolean(item.unavailableByStoreId?.[shop.id]);
  const priceId = `${item.id}-price-${shop.id}`;
  const priceErrorId = `${item.id}-price-${shop.id}-error`;
  const unavailableId = `${item.id}-unavailable-${shop.id}`;
  const availId = `${item.id}-avail-error`;
  const priceInputRef = useRef<HTMLInputElement>(null);
  const isLeadAvailabilityTarget = shop.id === shops[0]?.id;
  const showAvailOnToggle = Boolean(
    showErrors && availabilityError && isLeadAvailabilityTarget,
  );

  return (
    <div className="shop-price">
      <span className="mobile-field-label">{shopName}</span>
      <div className="shop-price__controls">
        <label
          className={`money-input ${unavailable ? "money-input--unavailable" : ""}`}
        >
          <span aria-hidden="true">RM</span>
          <input
            ref={priceInputRef}
            id={priceId}
            type="text"
            inputMode="decimal"
            value={unavailable ? "" : priceValue}
            placeholder="0.00"
            disabled={unavailable}
            aria-label={`${itemName} price at ${shopName}`}
            aria-invalid={Boolean(priceError)}
            aria-describedby={priceError ? priceErrorId : undefined}
            onChange={(event) =>
              onPriceChange(item.id, shop.id, event.target.value)
            }
            onBlur={() => onPriceBlur(item.id, shop.id)}
          />
        </label>
        <label className="unavailable-toggle" htmlFor={unavailableId}>
          <input
            id={unavailableId}
            type="checkbox"
            checked={unavailable}
            aria-invalid={showAvailOnToggle}
            aria-describedby={showAvailOnToggle ? availId : undefined}
            onChange={(event) => {
              if (event.target.checked) {
                onUnavailableChange(item.id, shop.id, true);
                return;
              }
              onUnavailableChange(item.id, shop.id, false);
              queueMicrotask(() => priceInputRef.current?.focus());
            }}
          />
          <span>Unavailable</span>
        </label>
      </div>
      {priceError && (
        <span className="field-error" id={priceErrorId}>
          {priceError}
        </span>
      )}
    </div>
  );
}

export function ItemOfferEditor({
  items,
  shops,
  errors,
  showErrors,
  onAdd,
  onRemove,
  onItemChange,
  onPriceChange,
  onUnavailableChange,
  onPriceBlur,
}: ItemOfferEditorProps) {
  const canAdd = shops.length > 0 && items.length < 50;

  return (
    <section className="items-editor" aria-labelledby="item-editor-heading">
      <div className="editor-section__heading editor-section__heading--items">
        <div>
          <h2 id="item-editor-heading">Groceries and prices</h2>
          <p>
            Enter quantity and unit price at each shop. Leave a price blank only
            while you still need to type it — mark Unavailable when that shop
            does not sell the item.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="compact-empty-state compact-empty-state--items">
          <p>
            {shops.length === 0
              ? "Add a shop before adding groceries."
              : "No groceries added yet."}
          </p>
          {shops.length > 0 && (
            <button
              className="button button--primary"
              type="button"
              onClick={onAdd}
              data-empty-action="true"
            >
              + Add your first item
            </button>
          )}
        </div>
      ) : (
        <div className="comparison-table-wrap basic-price-table-wrap items-table-wrap">
          <table className="comparison-table basic-price-table items-table">
            <caption>Grocery quantities and unit prices at each shop</caption>
            <thead>
              <tr>
                <th scope="col">Grocery</th>
                <th scope="col">Quantity</th>
                {shops.map((shop) => (
                  <th scope="col" key={shop.id}>
                    {shop.name.trim() || "Unnamed shop"}
                    <span className="column-unit">Unit price (RM)</span>
                  </th>
                ))}
                <th scope="col">
                  <span className="visually-hidden">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, itemIndex) => {
                const itemName = item.name.trim() || `Item ${itemIndex + 1}`;
                const itemNameError = showErrors
                  ? errors.itemNames[item.id]
                  : undefined;
                const quantityError = showErrors
                  ? errors.quantities[item.id]
                  : undefined;
                const availabilityError = showErrors
                  ? errors.availability[item.id]
                  : undefined;
                const qtyId = `${item.id}-qty`;
                const qtyErrorId = `${item.id}-qty-error`;
                return (
                  <tr className="item-row basic-item-row" key={item.id}>
                    <th scope="row">
                      <GroceryNameField
                        item={item}
                        itemIndex={itemIndex}
                        itemName={itemName}
                        error={itemNameError}
                        availabilityError={availabilityError}
                        onItemChange={onItemChange}
                        autoEdit={!item.name.trim()}
                      />
                    </th>
                    <td>
                      <label className="table-field">
                        <span className="mobile-field-label">Quantity</span>
                        <input
                          id={qtyId}
                          className="quantity-input"
                          type="text"
                          inputMode="numeric"
                          value={item.quantityInput}
                          aria-label={`${itemName} quantity`}
                          aria-invalid={Boolean(quantityError)}
                          aria-describedby={
                            quantityError ? qtyErrorId : undefined
                          }
                          onChange={(event) =>
                            onItemChange(item.id, {
                              quantityInput: event.target.value,
                            })
                          }
                        />
                        {quantityError && (
                          <span className="field-error" id={qtyErrorId}>
                            {quantityError}
                          </span>
                        )}
                      </label>
                    </td>
                    {shops.map((shop) => (
                      <td key={shop.id}>
                        <ShopPriceField
                          item={item}
                          itemName={itemName}
                          shop={shop}
                          shops={shops}
                          priceError={
                            showErrors
                              ? errors.prices[item.id]?.[shop.id]
                              : undefined
                          }
                          availabilityError={availabilityError}
                          showErrors={showErrors}
                          onPriceChange={onPriceChange}
                          onUnavailableChange={onUnavailableChange}
                          onPriceBlur={onPriceBlur}
                        />
                      </td>
                    ))}
                    <td className="item-action-cell">
                      <button
                        className="button button--danger button--remove button--remove-item"
                        type="button"
                        onClick={() => onRemove(item.id)}
                        aria-label={`Remove ${itemName}`}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {items.length > 0 && (
        <div className="items-add-row">
          <button
            className="button button--add-item"
            type="button"
            onClick={onAdd}
            disabled={!canAdd}
          >
            + Add item
          </button>
        </div>
      )}

      {items.length >= 50 && (
        <p className="limit-note">Maximum of 50 items reached.</p>
      )}
    </section>
  );
}
