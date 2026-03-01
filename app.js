const parseForm = document.querySelector('#parse-form');
const linkInput = document.querySelector('#thread-link');
const feedback = document.querySelector('#form-feedback');
const itemsList = document.querySelector('#items-list');
const submitButton = parseForm.querySelector('button[type="submit"]');
const publishButton = document.querySelector('#publish-btn');
const publishResult = document.querySelector('#publish-result');
const publishedLink = document.querySelector('#published-link');
const copyLinkButton = document.querySelector('#copy-link-btn');

const SWIPE_ACTION_WIDTH = 152;
const INITIAL_ITEMS = [
  { name: 'Vintage Tee', price: 'RM35', status: 'AVAILABLE' },
  { name: 'Denim Jacket', price: 'RM80', status: 'SOLD' },
  { name: 'Canvas Tote', price: 'RM25', status: 'AVAILABLE' },
];

let currentItems = [];
let currentSourceUrl = '';
let isPublishing = false;
let openItemId = null;

function normalizeStatus(status) {
  return String(status || '').toUpperCase() === 'SOLD' ? 'SOLD' : 'AVAILABLE';
}

function toItemModel(item, index) {
  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    name: String(item.name || '').trim(),
    price: String(item.price || '').trim(),
    status: normalizeStatus(item.status),
  };
}

function refreshPublishButton() {
  publishButton.disabled = isPublishing || currentItems.length === 0 || !currentSourceUrl;
  publishButton.textContent = isPublishing ? 'Publishing...' : 'Publish This Page';
}

function closeSwipeRow(row) {
  const panel = row.querySelector('.swipe-panel');
  if (!panel) return;
  panel.style.transform = 'translateX(0px)';
  row.dataset.open = 'false';
}

function openSwipeRow(row) {
  const panel = row.querySelector('.swipe-panel');
  if (!panel) return;
  panel.style.transform = `translateX(-${SWIPE_ACTION_WIDTH}px)`;
  row.dataset.open = 'true';
  openItemId = row.dataset.itemId;
}

function closeAllSwipes(exceptId = null) {
  const rows = itemsList.querySelectorAll('.item-row[data-open="true"]');
  rows.forEach((row) => {
    if (exceptId && row.dataset.itemId === exceptId) return;
    closeSwipeRow(row);
  });

  if (!exceptId) {
    openItemId = null;
  }
}

function bindSwipeHandlers(row) {
  const panel = row.querySelector('.swipe-panel');
  if (!panel) return;

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startOffset = 0;

  panel.addEventListener(
    'touchstart',
    (event) => {
      const touch = event.touches[0];
      if (!touch) return;

      closeAllSwipes(row.dataset.itemId);

      dragging = true;
      startX = touch.clientX;
      startY = touch.clientY;
      startOffset = row.dataset.open === 'true' ? -SWIPE_ACTION_WIDTH : 0;
      row.classList.add('dragging');
    },
    { passive: true }
  );

  panel.addEventListener(
    'touchmove',
    (event) => {
      if (!dragging) return;

      const touch = event.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        return;
      }

      event.preventDefault();

      const next = Math.min(0, Math.max(-SWIPE_ACTION_WIDTH, startOffset + deltaX));
      panel.style.transform = `translateX(${next}px)`;
    },
    { passive: false }
  );

  panel.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    row.classList.remove('dragging');

    const matrix = new DOMMatrixReadOnly(getComputedStyle(panel).transform);
    const currentX = matrix.m41;

    if (currentX <= -SWIPE_ACTION_WIDTH * 0.45) {
      openSwipeRow(row);
      return;
    }

    closeSwipeRow(row);
    if (openItemId === row.dataset.itemId) {
      openItemId = null;
    }
  });

  panel.addEventListener('touchcancel', () => {
    dragging = false;
    row.classList.remove('dragging');
    closeSwipeRow(row);
  });
}

function renderItems(items) {
  itemsList.innerHTML = '';

  items.forEach((item) => {
    const row = document.createElement('li');
    row.className = 'item-row';
    row.dataset.itemId = item.id;
    row.dataset.open = 'false';

    const actions = document.createElement('div');
    actions.className = 'swipe-actions';
    actions.innerHTML = `
      <button type="button" class="swipe-action edit" data-action="edit" data-id="${item.id}">Edit</button>
      <button type="button" class="swipe-action delete" data-action="delete" data-id="${item.id}">Delete</button>
    `;

    const panel = document.createElement('div');
    panel.className = 'swipe-panel';

    const main = document.createElement('div');
    main.className = 'item-main';

    const name = document.createElement('p');
    name.className = 'item-name';
    name.textContent = item.name;

    const price = document.createElement('p');
    price.className = 'item-price';
    price.textContent = item.price;

    const status = document.createElement('span');
    const isAvailable = item.status === 'AVAILABLE';
    status.className = `status ${isAvailable ? 'status-available' : 'status-sold'}`;
    status.innerHTML = `<span class="dot"></span>${item.status}`;

    if (!isAvailable) {
      name.classList.add('sold');
    }

    main.append(name, price);
    panel.append(main, status);
    row.append(actions, panel);
    itemsList.append(row);

    bindSwipeHandlers(row);
  });

  refreshPublishButton();
}

function setLoading(loading) {
  submitButton.disabled = loading;
  submitButton.textContent = loading ? 'Converting...' : 'Turn Into List';
}

function setPublishLoading(loading) {
  isPublishing = loading;
  refreshPublishButton();
}

function resetPublishedLink() {
  publishResult.classList.add('hidden');
  publishedLink.textContent = '';
  publishedLink.href = '#';
}

parseForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const threadUrl = linkInput.value.trim();
  if (!threadUrl) {
    feedback.textContent = 'Please paste your Threads post link.';
    return;
  }

  feedback.textContent = 'Converting your post into item list...';
  setLoading(true);
  resetPublishedLink();

  try {
    const response = await fetch('/api/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ threadUrl }),
    });

    const payload = await response.json();

    if (!response.ok) {
      feedback.textContent = payload.error || 'Unable to parse this post right now.';
      currentItems = [];
      currentSourceUrl = '';
      renderItems(currentItems);
      return;
    }

    const items = Array.isArray(payload.items) ? payload.items : [];
    currentItems = items.map(toItemModel).filter((item) => item.name && item.price);
    currentSourceUrl = payload.sourceUrl || threadUrl;

    renderItems(currentItems);

    if (payload.warnings && payload.warnings.length > 0) {
      feedback.textContent = `Parsed with note: ${payload.warnings[0]}`;
      return;
    }

    feedback.textContent = 'Done. Swipe each row to edit or delete before publish.';
  } catch {
    feedback.textContent = 'Network error. Please try again.';
  } finally {
    setLoading(false);
  }
});

publishButton.addEventListener('click', async () => {
  if (!currentSourceUrl || currentItems.length === 0) {
    feedback.textContent = 'Convert a Threads post first before publishing.';
    return;
  }

  setPublishLoading(true);

  try {
    const response = await fetch('/api/listings/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceUrl: currentSourceUrl,
        items: currentItems,
        title: 'Threads Seller Listing',
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      feedback.textContent = payload.error || 'Could not publish listing right now.';
      return;
    }

    const absoluteLink = `${window.location.origin}${payload.publicUrl}`;
    publishedLink.textContent = absoluteLink;
    publishedLink.href = absoluteLink;
    publishResult.classList.remove('hidden');
    feedback.textContent = 'Published. Share this link in your Threads post.';
  } catch {
    feedback.textContent = 'Network error while publishing.';
  } finally {
    setPublishLoading(false);
  }
});

itemsList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action][data-id]');
  if (!button) return;

  const action = button.dataset.action;
  const itemId = button.dataset.id;
  const itemIndex = currentItems.findIndex((item) => item.id === itemId);

  if (itemIndex === -1) return;

  if (action === 'delete') {
    const confirmed = window.confirm('Delete this item from the list?');
    if (!confirmed) return;

    currentItems.splice(itemIndex, 1);
    renderItems(currentItems);
    feedback.textContent = 'Item deleted.';
    return;
  }

  if (action === 'edit') {
    const item = currentItems[itemIndex];
    const nextName = window.prompt('Item name', item.name);
    if (nextName === null) return;

    const trimmedName = nextName.trim();
    if (!trimmedName) {
      feedback.textContent = 'Item name cannot be empty.';
      return;
    }

    const nextPrice = window.prompt('Price (example: RM35)', item.price);
    if (nextPrice === null) return;

    const trimmedPrice = nextPrice.trim();
    if (!trimmedPrice) {
      feedback.textContent = 'Price cannot be empty.';
      return;
    }

    const nextStatusRaw = window.prompt('Status: AVAILABLE or SOLD', item.status);
    if (nextStatusRaw === null) return;

    const nextStatus = normalizeStatus(nextStatusRaw.trim());

    currentItems[itemIndex] = {
      ...item,
      name: trimmedName,
      price: trimmedPrice,
      status: nextStatus,
    };

    renderItems(currentItems);
    feedback.textContent = 'Item updated.';
  }
});

document.addEventListener('touchstart', (event) => {
  if (!event.target.closest('.item-row')) {
    closeAllSwipes();
  }
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.item-row')) {
    closeAllSwipes();
  }
});

refreshPublishButton();
currentItems = INITIAL_ITEMS.map(toItemModel);
renderItems(currentItems);
