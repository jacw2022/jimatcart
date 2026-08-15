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
  onPriceBlur: (itemId: string, shopId: string) => void;
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
  onPriceBlur,
}: ItemOfferEditorProps) {
  return (
    <section className="items-editor" aria-labelledby="items-heading">
      <div className="editor-section__heading">
        <div>
          <h3 id="items-heading">Groceries and prices</h3>
          <p>
            Enter the quantity and unit price at each shop. Leave a price blank
            when an item is unavailable there.
          </p>
        </div>
        <button
          className="button button--secondary"
          type="button"
          onClick={onAdd}
          disabled={shops.length === 0 || items.length >= 50}
        >
          Add item
        </button>
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
              Add your first item
            </button>
          )}
        </div>
      ) : (
        <div className="comparison-table-wrap basic-price-table-wrap">
          <table className="comparison-table basic-price-table">
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
                <th scope="col">Action</th>
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
                return (
                  <tr className="item-row basic-item-row" key={item.id}>
                    <th scope="row">
                      <label className="table-field">
                        <span className="mobile-field-label">Item name</span>
                        <input
                          type="text"
                          value={item.name}
                          placeholder="e.g. Jasmine rice"
                          aria-label={`Item ${itemIndex + 1} name`}
                          aria-invalid={Boolean(itemNameError)}
                          onChange={(event) =>
                            onItemChange(item.id, { name: event.target.value })
                          }
                        />
                        {itemNameError && (
                          <span className="field-error">{itemNameError}</span>
                        )}
                        {availabilityError && (
                          <span className="field-error">{availabilityError}</span>
                        )}
                      </label>
                    </th>
                    <td>
                      <label className="table-field">
                        <span className="mobile-field-label">Quantity</span>
                        <input
                          className="quantity-input"
                          type="text"
                          inputMode="numeric"
                          value={item.quantityInput}
                          aria-label={`${itemName} quantity`}
                          aria-invalid={Boolean(quantityError)}
                          onChange={(event) =>
                            onItemChange(item.id, {
                              quantityInput: event.target.value,
                            })
                          }
                        />
                        {quantityError && (
                          <span className="field-error">{quantityError}</span>
                        )}
                      </label>
                    </td>
                    {shops.map((shop) => {
                      const shopName = shop.name.trim() || "Unnamed shop";
                      const priceError = showErrors
                        ? errors.prices[item.id]?.[shop.id]
                        : undefined;
                      return (
                        <td key={shop.id}>
                          <span className="mobile-field-label">{shopName}</span>
                          <label className="table-field">
                            <span className="field-label">Unit price</span>
                            <span className="money-input">
                              <span aria-hidden="true">RM</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.priceInputsByStoreId[shop.id] ?? ""}
                                placeholder="Leave blank"
                                aria-label={`${itemName} price at ${shopName}`}
                                aria-invalid={Boolean(
                                  priceError ||
                                    (availabilityError && shop.id === shops[0]?.id),
                                )}
                                onChange={(event) =>
                                  onPriceChange(
                                    item.id,
                                    shop.id,
                                    event.target.value,
                                  )
                                }
                                onBlur={() => onPriceBlur(item.id, shop.id)}
                              />
                            </span>
                            {priceError && (
                              <span className="field-error">{priceError}</span>
                            )}
                          </label>
                        </td>
                      );
                    })}
                    <td className="item-action-cell">
                      <button
                        className="button button--danger"
                        type="button"
                        onClick={() => onRemove(item.id)}
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
      {items.length >= 50 && (
        <p className="limit-note">Maximum of 50 items reached.</p>
      )}
    </section>
  );
}
