import type { EditableShop, EditableTripCost } from "./basketDraft";

interface TripCostEditorProps {
  shops: EditableShop[];
  tripCosts: EditableTripCost[];
  errors: Record<number, string>;
  shouldShowFieldError: (fieldId: string) => boolean;
  onFieldTouched: (fieldId: string) => void;
  onChange: (index: number, value: string) => void;
  onBlur: (index: number) => void;
}

function shopName(shops: EditableShop[], id: string): string {
  const shop = shops.find((candidate) => candidate.id === id);
  return shop?.name.trim() || "Unnamed shop";
}

function formatRoute(shops: EditableShop[], storeIds: readonly string[]): string {
  return storeIds.map((id) => shopName(shops, id)).join(" + ");
}

export function TripCostEditor({
  shops,
  tripCosts,
  errors,
  shouldShowFieldError,
  onFieldTouched,
  onChange,
  onBlur,
}: TripCostEditorProps) {
  const singleTrips = tripCosts
    .map((trip, index) => ({ trip, index }))
    .filter(({ trip }) => trip.storeIds.length === 1);
  const pairTrips = tripCosts
    .map((trip, index) => ({ trip, index }))
    .filter(({ trip }) => trip.storeIds.length === 2);

  const singleEntered = singleTrips.filter(({ trip }) => trip.costInput.trim()).length;
  const pairEntered = pairTrips.filter(({ trip }) => trip.costInput.trim()).length;

  function renderField(trip: EditableTripCost, index: number, paired: boolean) {
    const route = formatRoute(shops, trip.storeIds);
    const fieldId = `trip-cost-${index}`;
    const error = shouldShowFieldError(fieldId) ? errors[index] : undefined;
    const errorId = `trip-cost-${index}-error`;
    return (
      <div className="trip-cost__row" key={trip.storeIds.join(":")}>
        <div className="trip-cost__route-block">
          <span className="trip-cost__route">{route}</span>
          {paired && (
            <span className="trip-cost__route-note">
              Full combined trip · order does not matter
            </span>
          )}
        </div>
        <label className="trip-cost__input">
          <span className="visually-hidden">Trip cost for {route} (RM)</span>
          <span className="money-input money-input--trip">
            <span aria-hidden="true">RM</span>
            <input
              id={fieldId}
              type="text"
              inputMode="decimal"
              value={trip.costInput}
              placeholder="0.00"
              aria-label={`Trip cost for ${route} (RM)`}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : "trip-cost-help"}
              onChange={(event) => onChange(index, event.target.value)}
              onBlur={() => {
                onFieldTouched(fieldId);
                onBlur(index);
              }}
            />
          </span>
          {error && (
            <span className="field-error" id={errorId}>
              {error}
            </span>
          )}
        </label>
      </div>
    );
  }

  return (
    <section className="trip-cost" aria-labelledby="trip-cost-heading">
      <div className="trip-cost__heading">
        <h2 id="trip-cost-heading">Travel costs</h2>
        <p id="trip-cost-help">
          Estimate Grab, petrol, tolls or parking for each plan — what you&apos;d
          actually spend, not a per-km formula.
        </p>
      </div>

      {shops.length === 0 ? (
        <p className="trip-cost__empty">Add a shop to enter travel estimates.</p>
      ) : (
        <>
          <p className="trip-cost__context" role="status">
            {shops.length} shop{shops.length === 1 ? "" : "s"} · enter{" "}
            {singleTrips.length} one-shop cost
            {singleTrips.length === 1 ? "" : "s"}
            {pairTrips.length > 0
              ? ` and ${pairTrips.length} two-shop cost${pairTrips.length === 1 ? "" : "s"}`
              : ""}
            .
          </p>
          <div className="trip-cost__group">
            <div className="trip-cost__group-head">
              <h3>One-shop trips</h3>
              <span
                className={`trip-cost__count${
                  singleEntered < singleTrips.length ? " trip-cost__count--open" : ""
                }`}
                aria-label={`${singleEntered} of ${singleTrips.length} one-shop trip costs entered`}
              >
                {singleEntered}/{singleTrips.length}
              </span>
            </div>
            <p className="trip-cost__group-note">
              Cost to go to that shop only and come back (e.g. one Grab ride or
              petrol for the round trip).
            </p>
            <div className="trip-cost__list" role="list">
              {singleTrips.map(({ trip, index }) => renderField(trip, index, false))}
            </div>
          </div>
          {pairTrips.length > 0 && (
            <div className="trip-cost__group trip-cost__group--pairs">
              <div className="trip-cost__group-head">
                <h3>Two-shop trips</h3>
                <span
                  className={`trip-cost__count${
                    pairEntered < pairTrips.length ? " trip-cost__count--open" : ""
                  }`}
                  aria-label={`${pairEntered} of ${pairTrips.length} two-shop trip costs entered`}
                >
                  {pairEntered}/{pairTrips.length}
                </span>
              </div>
              <p className="trip-cost__group-note">
                One combined cost for visiting both shops in one outing — not
                the sum of two one-shop trips. Shop order does not change the
                amount.
              </p>
              <div className="trip-cost__list" role="list">
                {pairTrips.map(({ trip, index }) => renderField(trip, index, true))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
