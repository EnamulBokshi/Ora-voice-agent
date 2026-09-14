import { IsIn, IsString } from 'class-validator';
import { BUSINESS_ARCHETYPES } from '../../common/constants/archetypes';

export class SwitchArchetypeDto {
  /**
   * The profile to make live. Switching never edits or clears the profile
   * being left; it stays on disk and is restored by switching back.
   */
  @IsString()
  @IsIn(BUSINESS_ARCHETYPES as unknown as string[])
  archetype: string;
}
