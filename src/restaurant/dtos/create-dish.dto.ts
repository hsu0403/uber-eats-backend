import { Field, InputType, Int, ObjectType, PickType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { Dish } from '../entities/dish.entity';

@InputType()
export class CreateDishInput extends PickType(Dish, [
  'name',
  'price',
  'description',
  'options',
]) {
  @Field(() => Int)
  restaurantId: number;

  @Field(() => String, { nullable: true })
  photo?: string;
}

@ObjectType()
export class CreateDishOutput extends CoreOutput {}
