#!/usr/bin/env node
/**
 * Seed demo content for LOCAL UI/UX work only.
 * Refuses anything except http://127.0.0.1:3200 or localhost:3200
 * (isolated test API: docker-compose.test.yml + apps/api/test/.env.test).
 *
 * Usage: node scripts/seed-demo.mjs
 */

const API = process.env.SEED_API_URL ?? 'http://127.0.0.1:3200';
if (!/^http:\/\/(127\.0\.0\.1|localhost):3200$/.test(API)) {
  console.error(`Refusing to seed non-local API: ${API}`);
  process.exit(1);
}

const PASSWORD = 'DemoPass123!';
const AUTHOR = { username: 'demo_author', email: 'demo.author@example.local', displayName: 'USaD Studio' };
const READERS = [
  { username: 'demo_reader', email: 'demo.reader@example.local' },
  { username: 'demo_reader2', email: 'demo.reader2@example.local' },
];

const BOOKS = [
  {
    title: 'Người Đi Qua Mùa Gió',
    subtitle: 'Một câu chuyện về những chuyến đi không hẹn trước',
    description: 'Hành trình của một người trẻ đi qua nhiều miền đất, gặp gỡ những con người bình dị và học cách lắng nghe chính mình.',
    category: 'van-hoc',
    tags: ['tiểu thuyết', 'hành trình', 'Việt Nam'],
    chapters: [
      ['Chương 1: Ga tàu lúc bình minh', '<p>Ga tàu nhỏ nằm nép bên sườn đồi. Người ta đến đó từ rất sớm, mang theo những chiếc ba lô cũ và một chút háo hức chưa kịp gọi thành tên.</p><p>Anh ngồi ở băng ghế cuối sân, nghe tiếng còi tàu xa dần. Gió thổi qua mái tôn, mang theo mùi cỏ ướt và mùi than còn sót lại từ đêm qua.</p>'],
      ['Chương 2: Người bán vé và tấm bản đồ', '<p>Người bán vé đưa cho anh một tấm bản đồ giấy đã ố màu. Trên đó, những con đường nhỏ được vẽ bằng nét mực xanh, nối liền các thị trấn mà anh chưa từng nghe tên.</p><blockquote>“Đi chậm thôi. Đường nào rồi cũng tới, chỉ có người vội là bỏ lỡ.”</blockquote><p>Anh gấp tấm bản đồ lại, cất vào túi áo trong.</p>'],
      ['Chương 3: Mùa gió cuối tháng', '<p>Tháng cuối năm, gió về từ phía biển. Những hàng cây ven đường nghiêng mình như đang thì thầm điều gì đó.</p><p>Anh dừng lại ở một quán nhỏ, gọi ly trà nóng. Ngoài kia, thành phố bắt đầu lên đèn, và anh biết chuyến đi này sẽ còn dài.</p>'],
    ],
  },
  {
    title: 'Tư Duy Của Đại Dương',
    subtitle: 'Những bài học từ thế giới dưới mặt nước',
    description: 'Một cuốn sách khoa học nhẹ nhàng về đại dương, nơi mọi sinh vật đều có cách thích nghi riêng để tồn tại và cộng sinh.',
    category: 'khoa-hoc',
    tags: ['khoa học', 'đại dương', 'tự nhiên'],
    chapters: [
      ['Chương 1: Vùng nước xanh thẳm', '<p>Dưới mặt nước vài chục mét, ánh sáng chỉ còn là những vệt xanh mờ. Các loài cá ở đây đã học cách sống chậm, tiết kiệm năng lượng và lắng nghe rung động của dòng chảy.</p>'],
      ['Chương 2: Những mạng lưới vô hình', '<p>Một rạn san hô không phải là tập hợp của những cá thể đơn lẻ. Nó là một thành phố sống, nơi mỗi loài giữ một vai trò và mọi thay đổi nhỏ đều lan tỏa.</p><ul><li>San hô cung cấp nơi trú ẩn.</li><li>Cá nhỏ làm sạch ký sinh.</li><li>Dòng nước mang theo dưỡng chất.</li></ul>'],
      ['Chương 3: Học từ sự cân bằng', '<p>Đại dương không có kế hoạch trung tâm, nhưng vẫn duy trì được sự cân bằng trong hàng triệu năm. Đó là bài học về hệ thống, về sự kiên nhẫn và về giới hạn.</p>'],
    ],
  },
  {
    title: 'Những Tầng Im Lặng',
    subtitle: 'Hiểu mình giữa những ồn ào',
    description: 'Những ghi chép tâm lý học ứng dụng về sự im lặng, ranh giới cá nhân và cách xây dựng một đời sống nội tâm vững vàng.',
    category: 'tam-ly',
    tags: ['tâm lý', 'chánh niệm', 'phát triển bản thân'],
    chapters: [
      ['Chương 1: Tiếng ồn bên trong', '<p>Không phải mọi sự im lặng đều là bình yên. Có những khoảng lặng chỉ là nơi tiếng nói bên trong được phép lớn hơn.</p><p>Bước đầu tiên để hiểu mình là nhận ra mình đang nói gì với chính mình.</p>'],
      ['Chương 2: Ranh giới mềm', '<p>Ranh giới không phải là bức tường. Nó giống như mép nước: rõ ràng, nhưng vẫn có thể chuyển động.</p>'],
      ['Chương 3: Trở về nhà', '<p>Trở về nhà không phải là trở về một nơi chốn, mà là trở về với những giá trị mình đã chọn sống cùng.</p>'],
    ],
  },
  {
    title: 'Sài Gòn Một Thời Chưa Xa',
    subtitle: 'Ký ức qua những con đường',
    description: 'Những mẩu chuyện lịch sử đời thường về Sài Gòn: hàng quán, con hẻm, âm thanh và nhịp sống của một thành phố luôn dịch chuyển.',
    category: 'lich-su',
    tags: ['lịch sử', 'Sài Gòn', 'ký ức'],
    chapters: [
      ['Chương 1: Buổi sáng ở chợ cũ', '<p>Chợ mở cửa khi trời còn chưa sáng hẳn. Những gánh hàng đầu tiên đi vào thành phố, mang theo hơi nước và mùi của một ngày mới.</p>'],
      ['Chương 2: Những con hẻm nhớ tên người', '<p>Mỗi con hẻm có một cái tên, hoặc không có tên nhưng người ta vẫn nhớ bằng một dấu hiệu rất riêng: cây me, quán nước, tiếng đàn.</p>'],
      ['Chương 3: Thành phố của những chuyển động', '<p>Sài Gòn không đứng yên. Thành phố lớn lên bằng những chuyến xe, những cuộc gặp gỡ và những người đến rồi ở lại.</p>'],
    ],
  },
  {
    title: 'Thiết Kế Một Đời Sống',
    subtitle: 'Từ những điều nhỏ nhất',
    description: 'Cuốn sách thực hành về thói quen, không gian sống và cách thiết kế một nhịp sống phù hợp với chính mình.',
    category: 'ky-nang-song',
    tags: ['thói quen', 'tối giản', 'năng suất'],
    chapters: [
      ['Chương 1: Bắt đầu từ căn phòng', '<p>Môi trường xung quanh luôn thì thầm với chúng ta. Một căn phòng gọn gàng không chỉ dễ nhìn, mà còn giúp tâm trí bớt phải quyết định.</p>'],
      ['Chương 2: Nhịp điệu thay vì động lực', '<p>Động lực đến rồi đi. Nhịp điệu thì ở lại. Hãy thiết kế những hành động nhỏ đến mức bạn có thể làm chúng cả vào ngày mệt nhất.</p>'],
      ['Chương 3: Đủ là một lựa chọn', '<p>Biết đủ không phải là ngừng phát triển. Đó là biết mình đang đổi thời gian và sức lực để lấy điều gì.</p>'],
    ],
  },
  {
    title: 'Khu Vườn Của Những Ý Tưởng',
    subtitle: 'Ghi chép về sáng tạo và quan sát',
    description: 'Một tập tản văn về sáng tạo, nơi ý tưởng được chăm sóc như một khu vườn: có mùa gieo, mùa chờ và mùa thu hoạch.',
    category: 'nghe-thuat',
    tags: ['sáng tạo', 'tản văn', 'nghệ thuật'],
    chapters: [
      ['Chương 1: Gieo một hạt nhỏ', '<p>Ý tưởng đầu tiên thường không đẹp. Nó chỉ là một hạt nhỏ, chưa có hình dạng, cần được giữ ấm bằng sự tò mò.</p>'],
      ['Chương 2: Học cách chờ', '<p>Có những giai đoạn không làm gì cả cũng là một phần của công việc. Đất cần thời gian, và người làm vườn cần học cách không nhổ cây lên để xem rễ.</p>'],
      ['Chương 3: Mùa thu hoạch', '<p>Khi ý tưởng đã đủ lớn, việc còn lại là đưa nó ra khỏi khu vườn riêng và để người khác chạm vào.</p>'],
    ],
  },
];
async function request(path, method = 'GET', body, token) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data };
}

async function ensureUser(user) {
  const registered = await request('/auth/register', 'POST', {
    username: user.username,
    email: user.email,
    password: PASSWORD,
  });
  if (![201, 409].includes(registered.status)) {
    throw new Error(`register ${user.username} failed: ${registered.status} ${JSON.stringify(registered.data)}`);
  }
  const login = await request('/auth/login', 'POST', { identifier: user.username, password: PASSWORD });
  if (login.status !== 200) {
    throw new Error(`login ${user.username} failed: ${login.status} ${JSON.stringify(login.data)}`);
  }
  return login.data;
}

async function main() {
  const health = await request('/health');
  if (health.status !== 200) throw new Error(`API not healthy at ${API}`);

  const author = await ensureUser(AUTHOR);
  const readers = [];
  for (const reader of READERS) readers.push({ ...reader, ...(await ensureUser(reader)) });

  await request('/me', 'PATCH', {
    displayName: AUTHOR.displayName,
    bio: 'Không gian thử nghiệm nội dung cho giao diện BOOKFORFREEDOM.',
    isPublic: true,
  }, author.accessToken);

  const categories = await request('/studio/categories', 'GET', undefined, author.accessToken);
  const categoryBySlug = new Map((categories.data?.data ?? []).map((item) => [item.slug, item.categoryId]));
  const existing = await request('/studio/books', 'GET', undefined, author.accessToken);
  const existingTitles = new Set((existing.data?.data ?? []).map((book) => book.title));

  for (const book of BOOKS) {
    if (existingTitles.has(book.title)) {
      console.log(`skip existing book: ${book.title}`);
      continue;
    }
    const created = await request('/studio/books', 'POST', {
      title: book.title,
      subtitle: book.subtitle,
      description: book.description,
      language: 'vi',
    }, author.accessToken);
    if (created.status !== 201) throw new Error(`create book failed: ${JSON.stringify(created.data)}`);
    const bookUuid = created.data.bookUuid;

    const categoryId = categoryBySlug.get(book.category);
    if (categoryId) {
      await request(`/studio/books/${bookUuid}/categories`, 'PUT', { categoryIds: [categoryId] }, author.accessToken);
    }
    await request(`/studio/books/${bookUuid}/tags`, 'PUT', { tags: book.tags }, author.accessToken);

    for (const [title, content] of book.chapters) {
      const result = await request(`/studio/books/${bookUuid}/chapters`, 'POST', { title, content }, author.accessToken);
      if (result.status !== 201) throw new Error(`create chapter failed: ${JSON.stringify(result.data)}`);
    }

    const published = await request(`/studio/books/${bookUuid}/publish`, 'POST', {
      scope: 'community',
      authorName: AUTHOR.displayName,
      publisherName: 'NXB Tự Do',
      publicationYear: 2026,
    }, author.accessToken);
    if (published.status !== 201) throw new Error(`publish failed: ${JSON.stringify(published.data)}`);

    const slug = published.data.slug;
    const chapters = await request(`/books/${slug}/chapters`);
    const chapterRows = chapters.data?.data ?? [];

    for (const [index, reader] of readers.entries()) {
      await request(`/library/${slug}`, 'POST', undefined, reader.accessToken);
      await request(`/library/${slug}`, 'PATCH', {
        isFavorite: index === 0,
        status: index === 0 ? 'reading' : 'want_to_read',
      }, reader.accessToken);
      const chapter = chapterRows[Math.min(index, chapterRows.length - 1)];
      if (chapter) {
        await request(`/progress/${slug}`, 'PUT', {
          chapterUuid: chapter.chapter_uuid,
          percentComplete: index === 0 ? 35 : 10,
        }, reader.accessToken);
      }
      await request(`/books/${slug}/comments`, 'POST', {
        body: index === 0
          ? 'Không gian đọc rất dễ chịu, mình thích cách chia chương và lưu tiến độ.'
          : 'Bìa và bố cục ổn, mong có thêm chế độ đọc ban đêm sâu hơn.',
      }, reader.accessToken);
      await request(`/books/${slug}/reviews`, 'POST', {
        rating: index === 0 ? 5 : 4.5,
        title: 'Trải nghiệm thử',
        body: 'Đánh giá demo để kiểm tra giao diện cộng đồng.',
      }, reader.accessToken);
    }

    console.log(`seeded book: ${book.title} (/books/${slug})`);
    existingTitles.add(book.title);
  }

  // Extra local-only books so pagination (1, 2, 3, …) can be reviewed.
  const bulkCategories = ['van-hoc', 'khoa-hoc', 'lich-su', 'tam-ly', 'ky-nang-song', 'nghe-thuat'];
  for (let index = 1; index <= 30; index += 1) {
    const title = `Sách demo ${String(index).padStart(2, '0')}`;
    if (existingTitles.has(title)) {
      console.log(`skip existing book: ${title}`);
      continue;
    }
    const created = await request('/studio/books', 'POST', {
      title,
      subtitle: 'Nội dung demo cho kiểm thử giao diện.',
      description: `Sách demo số ${index} dùng để kiểm tra lưới 5 cột, phân trang và bộ lọc trên trang Khám phá.`,
      language: 'vi',
    }, author.accessToken);
    if (created.status !== 201) throw new Error(`create bulk book failed: ${JSON.stringify(created.data)}`);
    const bookUuid = created.data.bookUuid;

    const categoryId = categoryBySlug.get(bulkCategories[(index - 1) % bulkCategories.length]);
    if (categoryId) {
      await request(`/studio/books/${bookUuid}/categories`, 'PUT', { categoryIds: [categoryId] }, author.accessToken);
    }
    await request(`/studio/books/${bookUuid}/tags`, 'PUT', { tags: ['demo'] }, author.accessToken);
    await request(`/studio/books/${bookUuid}/chapters`, 'POST', {
      title: 'Chương 1: Giới thiệu',
      content: `<p>Đây là nội dung demo số ${index}. Trang Khám phá hiển thị 5 sách mỗi hàng và tối đa 3 hàng mỗi trang.</p>`,
    }, author.accessToken);
    const published = await request(`/studio/books/${bookUuid}/publish`, 'POST', {
      scope: 'community',
      authorName: AUTHOR.displayName,
      publicationYear: 2026,
    }, author.accessToken);
    if (published.status !== 201) throw new Error(`publish bulk book failed: ${JSON.stringify(published.data)}`);
    existingTitles.add(title);
    console.log(`seeded bulk book: ${title} (/books/${published.data.slug})`);
  }

  console.log('DONE');
  console.log(`Author login: ${AUTHOR.username} / ${PASSWORD}`);
  console.log(`Reader login: ${READERS[0].username} / ${PASSWORD}`);
  console.log('Admin login: e2e_admin / E2eAdminPass123!');
}

main().catch((error) => {
  console.error('SEED_FAILED', error);
  process.exit(1);
});

