import { IsNotEmpty, IsObject } from 'class-validator';

export class ManualIngestDto {
  @IsNotEmpty()
  @IsObject()
  rawPayload: Record<string, any>;

  @IsNotEmpty()
  @IsObject()
  fieldMapping: {
    idField: string;
    nameField: string;
    priceField: string;
    descriptionField?: string;
    categoryField?: string;
  };
}
