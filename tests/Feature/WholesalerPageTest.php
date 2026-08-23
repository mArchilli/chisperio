<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WholesalerPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_wholesaler_page_can_be_rendered(): void
    {
        $this->get(route('mayoristas.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mayoristas')
                ->where('canLogin', true)
            );
    }
}
