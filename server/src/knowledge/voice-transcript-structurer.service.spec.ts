import { ConfigService } from '@nestjs/config';
import { DocType } from './schemas/knowledge-base.schema';
import {
  TranscriptTurn,
  VoiceTranscriptStructurerService,
} from './voice-transcript-structurer.service';

/** A structurer with no API key, so every call takes the heuristic path. */
function heuristicStructurer(): VoiceTranscriptStructurerService {
  return new VoiceTranscriptStructurerService({
    get: () => undefined,
  } as unknown as ConfigService);
}

function merchant(...lines: string[]): TranscriptTurn[] {
  return lines.map((text) => ({ speaker: 'merchant' as const, text }));
}

describe('VoiceTranscriptStructurerService', () => {
  describe('without a model available', () => {
    it('files a session into separate documents by topic instead of one note', async () => {
      const service = heuristicStructurer();

      const { entries, method } = await service.structure(
        merchant(
          'We accept returns within thirty days of delivery, unopened only.',
          'Our tote bags are full grain leather and should be conditioned twice a year.',
          'When someone hesitates on price, offer the bundle discount before dropping the price.',
        ),
      );

      expect(method).toBe('heuristic');
      const docTypes = entries.map((e) => e.docType);
      expect(docTypes).toContain(DocType.POLICY);
      expect(docTypes).toContain(DocType.PRODUCT_MANUAL);
      expect(docTypes).toContain(DocType.SALES_PLAYBOOK);
      expect(entries.length).toBeGreaterThan(1);
    });

    it('marks heuristic output for review so it is not trusted like model output', async () => {
      const service = heuristicStructurer();
      const { entries } = await service.structure(
        merchant('Shipping to Dhaka takes two business days.'),
      );

      expect(entries[0].tags).toContain('uncategorised-review');
    });

    it('ignores ORA\'s own replies so the agent cannot teach itself', async () => {
      const service = heuristicStructurer();

      const { entries } = await service.structure([
        { speaker: 'ora', text: 'We offer free shipping on every order worldwide.' },
        { speaker: 'ora', text: 'Our warranty covers accidental damage for five years.' },
      ]);

      expect(entries).toEqual([]);
    });

    it('drops utterances too short to carry knowledge', async () => {
      const service = heuristicStructurer();
      const { entries } = await service.structure(merchant('yeah', 'ok', 'hmm'));
      expect(entries).toEqual([]);
    });
  });

  describe('sanitising extracted entries', () => {
    it('rejects an unknown docType rather than writing it to the database', async () => {
      const service = heuristicStructurer();
      const sanitise = (service as any).sanitise.bind(service);

      const [entry] = sanitise([
        { docType: 'totally_made_up', title: 'A title', content: 'Some content', confidence: 0.9 },
      ]);

      expect(Object.values(DocType)).toContain(entry.docType);
    });

    it('drops entries the model was not confident about', async () => {
      const service = heuristicStructurer();
      const sanitise = (service as any).sanitise.bind(service);

      const entries = sanitise([
        { docType: DocType.FAQ, title: 'Certain', content: 'Kept', confidence: 0.9 },
        { docType: DocType.FAQ, title: 'Unsure', content: 'Dropped', confidence: 0.1 },
      ]);

      expect(entries).toHaveLength(1);
      expect(entries[0].title).toBe('Certain');
    });

    it('collapses duplicate titles within one session', async () => {
      const service = heuristicStructurer();
      const sanitise = (service as any).sanitise.bind(service);

      const entries = sanitise([
        { docType: DocType.POLICY, title: 'Returns', content: 'First', confidence: 0.9 },
        { docType: DocType.POLICY, title: 'returns', content: 'Second', confidence: 0.9 },
      ]);

      expect(entries).toHaveLength(1);
    });

    it('caps how many documents a single session can create', async () => {
      const service = heuristicStructurer();
      const sanitise = (service as any).sanitise.bind(service);

      const many = Array.from({ length: 40 }, (_, i) => ({
        docType: DocType.FAQ,
        title: `Topic ${i}`,
        content: 'Content',
        confidence: 0.9,
      }));

      expect(sanitise(many).length).toBeLessThanOrEqual(12);
    });

    it('skips entries with no usable title or content', async () => {
      const service = heuristicStructurer();
      const sanitise = (service as any).sanitise.bind(service);

      expect(
        sanitise([
          { docType: DocType.FAQ, title: '   ', content: 'orphan content', confidence: 0.9 },
          { docType: DocType.FAQ, title: 'orphan title', content: '', confidence: 0.9 },
        ]),
      ).toEqual([]);
    });
  });
});
