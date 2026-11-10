import { useCallback, useEffect, useMemo, useState } from 'react';
import { booksApi } from './api';
import BookForm from './BookForm';
import Modal from './Modal';

const PAGE_SIZE = 15;
const SPINES = ['#2F6B57', '#7A3E48', '#2F4F7F', '#9A6B1F', '#5B4A7A', '#3E6E7A'];

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

function spineColor(title) {
  let hash = 0;
  for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return SPINES[hash % SPINES.length];
}

const SORTS = {
  newest: { label: 'Newest first', fn: (a, b) => b.id - a.id },
  oldest: { label: 'Oldest first', fn: (a, b) => a.id - b.id },
  title: { label: 'Title A–Z', fn: (a, b) => a.title.localeCompare(b.title) },
  author: { label: 'Author A–Z', fn: (a, b) => a.author.localeCompare(b.author) },
  priceLow: { label: 'Price, low to high', fn: (a, b) => a.price - b.price },
  priceHigh: { label: 'Price, high to low', fn: (a, b) => b.price - a.price },
};

export default function App() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState(null); // null = closed, {} = new book, book = edit
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toast, setToast] = useState('');

  const loadBooks = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const slowTimer = setTimeout(() => setSlow(true), 4000);
    try {
      setBooks(await booksApi.list());
    } catch (err) {
      setLoadError(err.message);
    } finally {
      clearTimeout(slowTimer);
      setSlow(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? books.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
      : books;
    return [...list].sort(SORTS[sort].fn);
  }, [books, query, sort]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageBooks = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function handleSave(data) {
    if (editing?.id) {
      const updated = await booksApi.update(editing.id, data);
      setBooks((list) => list.map((b) => (b.id === updated.id ? updated : b)));
      setToast('Changes saved');
    } else {
      const created = await booksApi.create(data);
      setBooks((list) => [...list, created]);
      setSort('newest');
      setPage(1);
      setToast('Book added');
    }
    setEditing(null);
  }

  async function handleDelete() {
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await booksApi.remove(deleting.id);
      setBooks((list) => list.filter((b) => b.id !== deleting.id));
      setDeleting(null);
      setToast('Book deleted');
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteBusy(false);
    }
  }

  function closeDelete() {
    setDeleting(null);
    setDeleteError('');
  }

  return (
    <div className="page">
      <header className="masthead">
        <div>
          <h1>Book catalogue</h1>
          <p className="subtitle">
            {loading ? 'Loading your books…' : `${books.length} ${books.length === 1 ? 'book' : 'books'} on the shelf`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({})}>
          Add book
        </button>
      </header>

      <div className="toolbar">
        <label className="search">
          <span className="visually-hidden">Search books</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18">
            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Search by title or author"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="sort">
          <span className="visually-hidden">Sort books</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>

      <main>
        {loading && (
          <div className="state">
            <div className="loader" aria-hidden="true"><span /><span /><span /></div>
            <p>{slow ? 'Waking up the server. On the free plan this can take up to a minute.' : 'Loading books…'}</p>
          </div>
        )}

        {!loading && loadError && (
          <div className="state state-error" role="alert">
            <p>{loadError}</p>
            <button className="btn btn-quiet" onClick={loadBooks}>Try again</button>
          </div>
        )}

        {!loading && !loadError && books.length === 0 && (
          <div className="state">
            <p>The shelf is empty. Add your first book to get started.</p>
            <button className="btn btn-primary" onClick={() => setEditing({})}>Add book</button>
          </div>
        )}

        {!loading && !loadError && books.length > 0 && visible.length === 0 && (
          <div className="state">
            <p>No books match “{query}”. Try a different title or author.</p>
          </div>
        )}

        {!loading && !loadError && pageBooks.length > 0 && (
          <>
            <ul className="shelf">
              {pageBooks.map((book) => (
                <li key={book.id} className="book" style={{ '--spine': spineColor(book.title) }}>
                  <div className="book-info">
                    <h3 className="book-title">{book.title}</h3>
                    <p className="book-author">{book.author}</p>
                  </div>
                  <p className="book-price">{rupees.format(book.price)}</p>
                  <div className="book-actions">
                    <button className="btn btn-small" onClick={() => setEditing(book)} aria-label={`Edit ${book.title}`}>
                      Edit
                    </button>
                    <button className="btn btn-small btn-danger-quiet" onClick={() => setDeleting(book)} aria-label={`Delete ${book.title}`}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {pageCount > 1 && (
              <nav className="pager" aria-label="Pages">
                <button className="btn btn-quiet" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                  Previous
                </button>
                <span>Page {currentPage} of {pageCount}</span>
                <button className="btn btn-quiet" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </main>

      <Modal open={editing !== null} onClose={() => setEditing(null)} labelledBy="form-title">
        <BookForm key={editing?.id ?? 'new'} book={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
      </Modal>

      <Modal open={deleting !== null} onClose={closeDelete} labelledBy="delete-title" className="modal-small">
        {deleting && (
          <div className="confirm">
            <h2 id="delete-title">Delete this book?</h2>
            <p>“{deleting.title}” by {deleting.author} will be removed permanently.</p>
            {deleteError && <p className="form-error" role="alert">{deleteError}</p>}
            <div className="form-actions">
              <button className="btn btn-quiet" onClick={closeDelete} disabled={deleteBusy}>Keep book</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleteBusy}>
                {deleteBusy ? 'Deleting…' : 'Delete book'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <div className={`toast ${toast ? 'toast-show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}
