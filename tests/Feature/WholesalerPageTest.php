<?php

namespace Tests\Feature;

use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WholesalerPageTest extends TestCase
{
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
