import { Body, Controller, Delete, Get, HttpException, InternalServerErrorException, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiParam, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PaginationQueryDto } from "../../common/dtos/pagination-query.dto";
import { CreateUserHttpDto } from "./http-dtos/create-user.http-dto";
import { UsersService } from "./users.service";
import { UpdateUserHttpDto } from "./http-dtos/update-user.http.dto";

@ApiTags('Usuários')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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

    @ApiParam({
        name: 'id',
        example: 'uuid-do-usuario',
        required: true,
        description: 'UUID do usuário'
    })
    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() body: UpdateUserHttpDto
    ) {
        try {
            return this._usersService.update(id, body);
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
    @Delete(':id')
    async delete(@Param('id') id: string) {
        try {
            return this._usersService.delete(id);
        }
        catch (err) {
            if (err instanceof HttpException) throw err;
            throw new InternalServerErrorException(err.message);
        }
    }

}