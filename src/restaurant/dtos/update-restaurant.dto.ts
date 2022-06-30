import { ArgsType, Field, InputType, Int, PartialType } from '@nestjs/graphql';
import { CreateRestaurantDto } from './create-restaurant.dto';

@InputType()
class UpdateRestaurantInputType extends PartialType(CreateRestaurantDto) {}

@ArgsType()
export class UpdateRestaurantDto {
  @Field(() => Int)
  id: number;

  @Field(() => UpdateRestaurantInputType)
  data: UpdateRestaurantInputType;
}
