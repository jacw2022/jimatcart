import type { EditableShop, EditableTripCost } from "./basketDraft";

interface TripCostEditorProps {
  shops: EditableShop[];
  tripCosts: EditableTripCost[];
  errors: Record<number, string>;
  showErrors: boolean;
  onChange: (index: number, value: string) => void;
  onBlur: (index: number) => void;
}

function shopName(shops: EditableShop[], id: string): string {
  const shop = shops.find((candidate) => candidate.id === id);
  return shop?.name.trim() || "Unnamed shop";
}

export function TripCostEditor({
  shops,
  tripCosts,
  errors,
  showErrors,
  onChange,
  onBlur,
}: TripCostEditorProps) {
  const singleTrips = tripCosts
    .map((trip, index) => ({ trip, index }))
    .filter(({ trip }) => trip.storeIds.length === 1);
  const pairTrips = tripCosts
    .map((trip, index) => ({ trip, index }))
    .filter(({ trip }) => trip.storeIds.length === 2);

  function renderField(trip: EditableTripCost, index: number) {
    const names = trip.storeIds.map((id) => shopName(shops, id));
    const route = names.join(" and ");
    const error = showErrors ? errors[index] : undefined;
    const errorId = `trip-cost-${index}-error`;
    return (
      <label className="trip-cost__field" key={trip.storeIds.join(":")}>
        <span className="trip-cost__route">{route}</span>
        <span className="field-label">Total trip cost (RM)</span>
        <span className="money-input">
          <span aria-hidden="true">RM</span>
          <input
            type="text"
            inputMode="decimal"
            value={trip.costInput}
            placeholder="Enter estimate"
            aria-label={`Total trip cost for ${route} (RM)`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : "trip-cost-help"}
            onChange={(event) => onChange(index, event.target.value)}
            onBlur={() => onBlur(index)}
          />
        </span>
        {error && (
          <span className="field-error" id={errorId}>
            {error}
          </span>
        )}
      </label>
    );
  }

  return (
    <section className="editor-section trip-cost" aria-labelledby="trip-cost-heading">
      <div className="trip-cost__heading">
        <h3 id="trip-cost-heading">Estimated travel costs</h3>
        <p id="trip-cost-help">
          Enter the complete trip cost for visiting each shop alone and each
          two-shop combination. Include fares, fuel, tolls or parking as useful.
        </p>
      </div>

      {shops.length === 0 ? (
        <p className="trip-cost__empty">Add a shop to enter travel estimates.</p>
      ) : (
        <>
          <div className="trip-cost__group">
            <h4>Cost to visit one shop</h4>
            <div className="trip-cost__grid">
              {singleTrips.map(({ trip, index }) => renderField(trip, index))}
            </div>
          </div>
          {pairTrips.length > 0 && (
            <div className="trip-cost__group">
              <h4>Cost to combine two shops</h4>
              <div className="trip-cost__grid">
                {pairTrips.map(({ trip, index }) => renderField(trip, index))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
