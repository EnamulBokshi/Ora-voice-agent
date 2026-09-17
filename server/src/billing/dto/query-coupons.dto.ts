import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryCouponsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: 'all' | 'active' | 'inactive' | 'expired' | 'depleted';

  @IsOptional()
  @IsString()
  discountType?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
