import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  countWords,
  moveItem,
  statusLabel,
  validateChapter,
  validateForPublish,
  validateMetadata,
  visibilityLabel,
} from '../src/lib/studio-validation.js';

test('validateMetadata rejects empty and too-short titles', () => {
  assert.match(validateMetadata({ title: '' }) ?? '', /2 ký tự/);
  assert.match(validateMetadata({ title: ' A ' }) ?? '', /2 ký tự/);
});

test('validateMetadata accepts a normal draft and rejects oversized fields', () => {
  assert.equal(validateMetadata({ title: 'Bản thảo đầu tay', subtitle: 'Tập 1' }), null);
  assert.match(validateMetadata({ title: 'x'.repeat(501) }) ?? '', /500 ký tự/);
  assert.match(validateMetadata({ title: 'Hợp lệ', subtitle: 'y'.repeat(501) }) ?? '', /Phụ đề/);
});

test('validateChapter requires a title and caps its length', () => {
  assert.match(validateChapter({ title: '   ', content: '' }) ?? '', /không được để trống/);
  assert.match(validateChapter({ title: 'z'.repeat(301), content: '' }) ?? '', /300 ký tự/);
  assert.equal(validateChapter({ title: 'Chương 1', content: '' }), null);
});

test('validateForPublish blocks drafts without chapters', () => {
  assert.match(validateForPublish({ title: 'Sách hợp lệ' }, []) ?? '', /ít nhất một chương/);
});

test('validateForPublish blocks chapters without content', () => {
  const message = validateForPublish({ title: 'Sách hợp lệ' }, [
    { title: 'Chương 1', content: '   ' },
    { title: 'Chương 2', content: '<p></p>' },
  ]);
  assert.match(message ?? '', /chưa có nội dung/);
});

test('validateForPublish blocks a chapter with an empty title', () => {
  const message = validateForPublish({ title: 'Sách hợp lệ' }, [
    { title: '  ', content: 'Nội dung' },
  ]);
  assert.match(message ?? '', /Tiêu đề chương/);
});

test('validateForPublish accepts a complete draft', () => {
  const message = validateForPublish({ title: 'Sách hợp lệ' }, [
    { title: 'Chương 1', content: 'Một hai ba bốn năm' },
  ]);
  assert.equal(message, null);
});

test('countWords ignores markup and blank input', () => {
  assert.equal(countWords('<p>xin chào  thế giới</p>'), 4);
  assert.equal(countWords('&nbsp;&nbsp;'), 0);
  assert.equal(countWords(''), 0);
});

test('moveItem moves chapters and is a no-op outside bounds', () => {
  const items = ['a', 'b', 'c'];
  assert.deepEqual(moveItem(items, 0, 2), ['b', 'c', 'a']);
  assert.deepEqual(moveItem(items, 2, 0), ['c', 'a', 'b']);
  assert.equal(moveItem(items, 1, 1), items);
  assert.equal(moveItem(items, -1, 0), items);
  assert.equal(moveItem(items, 0, 3), items);
  assert.deepEqual(items, ['a', 'b', 'c']);
});

test('status and visibility labels fall back to the raw value', () => {
  assert.equal(statusLabel('draft'), 'Bản nháp');
  assert.equal(statusLabel('published'), 'Đã xuất bản');
  assert.equal(statusLabel('custom_state'), 'custom_state');
  assert.equal(visibilityLabel('public'), 'Công khai');
  assert.equal(visibilityLabel('other'), 'other');
});
