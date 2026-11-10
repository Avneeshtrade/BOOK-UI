import { useState } from 'react';

export default function BookForm({ book, onSave, onCancel }) {
  const isEdit = Boolean(book?.id);
  const [title, setTitle] = useState(book?.title ?? '');
  const [author, setAuthor] = useState(book?.author ?? '');
  const [price, setPrice] = useState(book?.price?.toString() ?? '');
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  function validate() {
    const errors = {};
    if (!title.trim()) errors.title = 'Enter a title.';
    if (!author.trim()) errors.author = 'Enter an author.';
    if (price === '') errors.price = 'Enter a price.';
    else if (Number.isNaN(Number(price)) || Number(price) < 0) errors.price = 'Price must be 0 or more.';
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setServerError('');
    try {
      await onSave({ title: title.trim(), author: author.trim(), price: Number(price) });
    } catch (err) {
      setServerError(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="book-form" onSubmit={handleSubmit} noValidate>
      <h2 id="form-title">{isEdit ? 'Edit book' : 'Add a book'}</h2>

      <label className="field">
        <span>Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={Boolean(fieldErrors.title)}
          autoFocus
        />
        {fieldErrors.title && <small className="field-error">{fieldErrors.title}</small>}
      </label>

      <label className="field">
        <span>Author</span>
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          aria-invalid={Boolean(fieldErrors.author)}
        />
        {fieldErrors.author && <small className="field-error">{fieldErrors.author}</small>}
      </label>

      <label className="field">
        <span>Price (₹)</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          aria-invalid={Boolean(fieldErrors.price)}
        />
        {fieldErrors.price && <small className="field-error">{fieldErrors.price}</small>}
      </label>

      {serverError && <p className="form-error" role="alert">{serverError}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-quiet" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add book'}
        </button>
      </div>
    </form>
  );
}
