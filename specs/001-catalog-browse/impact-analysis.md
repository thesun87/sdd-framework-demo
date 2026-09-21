# Impact Analysis: 001-catalog-browse

**Feature**: `001-catalog-browse`
**Track**: B — brownfield feature over completed `000-walking-skeleton`
**Created**: 2026-09-21
**Mode**: READ-ONLY analysis before implementation

## 1. Existing behaviour

Feature `000-walking-skeleton` currently provides a public storefront slice:

- `GET /api/products` returns all current Product summaries in one unpaginated list.
- `GET /api/products/:id` returns Product detail or not found for a missing Product.
- The Product list and Product detail expose Stock status only, never exact Stock.
- Responses containing Stock status are treated as non-cacheable and must stay fresh.
- The storefront home page fetches all Product summaries and renders Product cards that link to Product detail.
- Category storage already exists as a flat optional relation on Product, but the storefront does not yet expose Category browsing.
- Product-name normalization data exists for seeded Products, but there is no complete production-facing search behaviour for this feature yet.

Current gaps against `001-catalog-browse`:

- No public Category list or Category-selected Product list.
- No Product-name search from the storefront catalog.
- No pagination, default page size, maximum page-size clamp, or total-page context.
- Current list behaviour can deliver the whole catalog at once, which conflicts with PRD FR-3 for this feature.

## 2. Affected modules and contracts

Implementation planning must account for these affected areas:

- API catalog list/detail controller, service, and repository behaviour.
- Shared storefront Product schemas and strict response validation.
- Database schema and append-only migration path for any required Product-name search support and Product-list performance support.
- Storefront catalog client and home page state for Category navigation, search, and pagination.
- Storefront route handling and accessibility behaviour already established by feature `000`.
- E2E storefront journey and WCAG coverage.
- Stock invariants and public Stock status seam used by catalog reads.

## 3. Contracts that must remain compatible or move together

The feature changes the Product-list contract, so all contract consumers must move together:

- Guest access must remain public; no auth redirect may be introduced for catalog browse/search/detail.
- Existing Product summary fields must remain available to the storefront.
- Exact Stock must remain absent from Guest and Customer-visible data.
- Stock status must remain fresh and represented only through the approved Stock status values.
- Product detail not-found behaviour must remain not found, not an unhandled error.
- Pagination metadata, Category list shape, and search/category parameters must be defined together with the shared storefront schema and the storefront client.
- The current no-parameter Product list path should intentionally map to first page, default size 24.

## 4. Tests to preserve and extend

Existing tests that must keep passing:

- Catalog list/detail tests proving strict response shape, no exact Stock, no-store/fresh Stock status, and not-found detail behaviour.
- Shared Product schema tests proving Stock status enum and exact-Stock guards.
- Storefront client tests proving no stale Stock status behaviour.
- Home page and Product card tests proving empty-list and out-of-stock visibility.
- Router/App/Product detail and E2E storefront journey tests, including WCAG checks.
- Stock invariant specs proving Stock never goes negative, Stock ledger consistency, restricted ledger deletion, and race behaviour on real PostgreSQL.

New tests should characterize current `000` behaviour before changing the list contract, then cover:

- Category list and Category-selected Product lists.
- Uncategorized Products appearing in all Products and search.
- Accent-insensitive and case-insensitive Product-name search.
- Search not matching description-only text.
- Empty Category/search/page results as non-error empty states.
- Default 24 Products per page, max 100 clamp, total-page context, and page reset on Category/search changes.
- 20,000 Product read-path performance expectations without returning the whole catalog.

## 5. Regression risks

- Accidentally retaining or reintroducing a full-table Product list at 20,000 Products.
- N+1 Stock status reads under large Product lists.
- Unstable Product ordering that causes duplicate/missing Products across pages.
- Product-name normalization mismatch, especially Vietnamese `đ`, accents, Unicode normalization, and mixed case.
- Category `NULL` semantics: uncategorized Products must appear in all Products and search, not in a specific Category.
- Strict shared-schema drift between API, storefront client, and UI tests.
- Exposing exact Stock while adding pagination metadata or client state.
- Caching or reusing stale Stock status while optimizing catalog reads.
- Accidentally adding auth requirements or redirecting Guest catalog access.
- Treating empty Category/search/page results as errors.
- Expanding into Product discontinuation lifecycle, Cart, Order, back-office CRUD, or other out-of-scope features.

## 6. Reusable assets

- Existing catalog controller/service/repository/module structure.
- Public Stock status seam used by catalog reads.
- Shared Zod schemas and inferred storefront types.
- Error envelope and response-validation patterns.
- Real PostgreSQL catalog and Stock test helpers.
- Existing assertions that exact Stock is absent from responses.
- Product card, home page, route announcer, and storefront routing patterns.
- Seed Product-name normalization rule as a reference for the canonical behaviour.

## 7. Migration and compatibility notes

- Any schema/index/backfill work must be append-only through the existing migration workflow.
- Do not use destructive rollback migrations for feature implementation.
- Preserve existing Stock checks, foreign keys, Stock ledger behaviour, and real-PostgreSQL test isolation.
- Coordinate API contract, shared schema, and storefront client changes atomically.
- Omitted Product-list parameters must have explicit default behaviour: page 1, page size 24.
- Page-size requests above 100 must clamp to 100.

## 8. Out of scope

- Product, Category, Product image, Stock, or Product discontinuation back-office CRUD.
- Cart, authentication, Customer account, Order, payment, and shipping flows.
- Product variants or hierarchical Category.
- Description search, fuzzy search, search suggestions, relevance ranking, or external search/cache services.
- Exact Stock disclosure to Guest or Customer.
- Product detail redesign beyond preserving existing FR-4/FR-5 behaviour.
