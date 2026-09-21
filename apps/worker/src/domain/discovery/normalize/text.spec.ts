import { stripHtml } from './text';

describe('stripHtml', () => {
  it('drops script and style content entirely', () => {
    expect(
      stripHtml('<p>Keep</p><script>evil()</script><style>a{}</style>'),
    ).toBe('Keep');
  });

  it('turns block ends into newlines and decodes entities', () => {
    expect(stripHtml('<p>One</p><p>Two &amp; three</p>')).toBe(
      'One\nTwo & three',
    );
  });

  it('turns <br> into a newline', () => {
    expect(stripHtml('a<br>b<br/>c')).toBe('a\nb\nc');
  });

  it('collapses a run of empty paragraphs to one blank line', () => {
    expect(stripHtml('<p>a</p><p></p><p></p><p></p><p>b</p>')).toBe('a\n\nb');
  });
});
