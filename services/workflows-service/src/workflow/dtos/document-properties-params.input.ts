import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DocumentPropertiesParamsInput {
  /**
   * The workflow id
   */
  @ApiProperty({
    required: true,
    type: String,
  })
  @IsString()
  id!: string;

  @ApiProperty({
    required: true,
    type: String,
  })
  @IsString()
  documentId!: string;
}
