import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { PaginationOutput } from 'src/common/dtos/pagination.dto';
import { Order, OrderStatus } from '../entities/order.entity';

@InputType()
export class GetOrdersInput {
  @Field(() => OrderStatus, { nullable: true })
  status?: OrderStatus;

  @Field(() => Number)
  page: number;
}

@ObjectType()
export class GetOrdersOutput extends PaginationOutput {
  @Field(() => [Order], { nullable: true })
  orders?: Order[];
}
