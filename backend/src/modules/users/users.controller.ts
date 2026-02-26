import { Body, Controller, Get, HttpException, InternalServerErrorException, Param, Post, Query } from "@nestjs/common";
import { ApiParam, ApiTags } from "@nestjs/swagger";
import { PaginationQueryDto } from "../../common/dtos/pagination-query.dto";
import { CreateUserHttpDto } from "./http-dtos/create-user.http-dto";
import { UsersService } from "./users.service";

@ApiTags('Usuários')
@Controller('v1/users')
export class UsersController {

    constructor(
        private readonly _usersService: UsersService
    ) { }

    @Post()
    async create(@Body() body: CreateUserHttpDto) {
        try {
            return this._usersService.create(body);
        }
        catch (err) {
            if (err instanceof HttpException) throw err;
            throw new InternalServerErrorException(err.message);
        }
    }

    @ApiParam({
        name: 'id',
        example: 'uuid-do-usuario',
        required: true,
        description: 'UUID do usuário'
    })
    @Get(':id')
    async findById(
        @Param('id') id: string
    ) {
        try {
            return this._usersService.findById(id);
        }
        catch (err) {
            if (err instanceof HttpException) throw err;
            throw new InternalServerErrorException(err.message);
        }
    }

    @Get()
    async findAll(@Query() pagination: PaginationQueryDto) {
        try {
            return this._usersService.findAll(pagination);
        }
        catch (err) {
            if (err instanceof HttpException) throw err;
            throw new InternalServerErrorException(err.message);
        }
    }
}