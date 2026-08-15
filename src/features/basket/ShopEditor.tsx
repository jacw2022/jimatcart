import type { EditableShop } from "./basketDraft";

interface ShopEditorProps {
  shops: EditableShop[];
  errors: Record<string, string>;
  showErrors: boolean;
  onAdd: () => void;
  onNameChange: (shopId: string, name: string) => void;
  onRemove: (shopId: string) => void;
}

export function ShopEditor({
  shops,
  errors,
  showErrors,
  onAdd,
  onNameChange,
  onRemove,
}: ShopEditorProps) {
  return (
    <section className="editor-section" aria-labelledby="shop-editor-heading">
      <div className="editor-section__heading">
        <div>
          <h3 id="shop-editor-heading">Shops to compare</h3>
          <p>Add up to three familiar shops.</p>
        </div>
        <button
          className="button button--secondary"
          type="button"
          onClick={onAdd}
          disabled={shops.length >= 3}
        >
          Add shop
        </button>
      </div>

      {shops.length === 0 ? (
        <div className="compact-empty-state">
          <p>No shops added yet.</p>
          <button
            className="button button--primary"
            type="button"
            onClick={onAdd}
            data-empty-action="true"
          >
            Add your first shop
          </button>
        </div>
      ) : (
        <div className="shop-list">
          {shops.map((shop, index) => {
            const error = showErrors ? errors[shop.id] : undefined;
            const errorId = `${shop.id}-name-error`;
            return (
              <div className="shop-card" key={shop.id}>
                <label className="field-group" htmlFor={`${shop.id}-name`}>
                  <span className="field-label">Shop {index + 1} name</span>
                  <input
                    id={`${shop.id}-name`}
                    type="text"
                    value={shop.name}
                    placeholder="e.g. Lotus's"
                    autoComplete="off"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    onChange={(event) =>
                      onNameChange(shop.id, event.target.value)
                    }
                  />
                  {error && (
                    <span className="field-error" id={errorId}>
                      {error}
                    </span>
                  )}
                </label>
                <button
                  className="button button--danger button--remove"
                  type="button"
                  onClick={() => onRemove(shop.id)}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
      {shops.length >= 3 && <p className="limit-note">Maximum of three shops reached.</p>}
    </section>
  );
}
