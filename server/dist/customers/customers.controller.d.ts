import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    create(user: JwtPayloadUser, dto: CreateCustomerDto): Promise<{
        id: any;
        businessId: any;
        name: any;
        email: string | null;
        phone: string | null;
        extractedPreferences: any;
        pastOrderIds: any;
        metadata: any;
        createdAt: any;
        updatedAt: any;
    }>;
    findAll(user: JwtPayloadUser, search?: string): Promise<{
        id: any;
        businessId: any;
        name: any;
        email: string | null;
        phone: string | null;
        extractedPreferences: any;
        pastOrderIds: any;
        metadata: any;
        createdAt: any;
        updatedAt: any;
    }[]>;
    findOne(user: JwtPayloadUser, id: string): Promise<{
        id: any;
        businessId: any;
        name: any;
        email: string | null;
        phone: string | null;
        extractedPreferences: any;
        pastOrderIds: any;
        metadata: any;
        createdAt: any;
        updatedAt: any;
    }>;
    update(user: JwtPayloadUser, id: string, dto: UpdateCustomerDto): Promise<{
        id: any;
        businessId: any;
        name: any;
        email: string | null;
        phone: string | null;
        extractedPreferences: any;
        pastOrderIds: any;
        metadata: any;
        createdAt: any;
        updatedAt: any;
    }>;
}
